import { normalizarBusca } from './biblioteca-exercicios.js';
export const FUSO_TREINO = 'America/Sao_Paulo';

export async function resumoTreinos(db, alunoId) {
  const [semana, ativa, hoje] = await Promise.all([
    db.query(`WITH limites AS (SELECT date_trunc('week', NOW() AT TIME ZONE $2) AS inicio)
      SELECT COUNT(s.id)::int AS concluidos, to_char(inicio,'YYYY-MM-DD') AS inicio_semana,
      to_char(inicio+INTERVAL '6 days','YYYY-MM-DD') AS fim_semana
      FROM limites LEFT JOIN sessoes_treino s ON s.aluno_id=$1 AND s.status='concluida'
        AND s.finalizada_em >= (inicio AT TIME ZONE $2) AND s.finalizada_em < ((inicio+INTERVAL '7 days') AT TIME ZONE $2)
      GROUP BY inicio`, [alunoId, FUSO_TREINO]),
    db.query("SELECT id,treino_id,titulo,status,iniciada_em FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('em_andamento','pausada')", [alunoId]),
    db.query(`SELECT t.*, EXISTS(SELECT 1 FROM sessoes_treino s WHERE s.aluno_id=$1 AND s.treino_id=t.id AND s.status='concluida'
      AND (s.finalizada_em AT TIME ZONE $2)::date=(NOW() AT TIME ZONE $2)::date) AS concluido_hoje
      FROM treinos t WHERE t.usuario_id=$1 AND NOT t.arquivada AND (t.inicio_em IS NULL OR t.inicio_em <= (NOW() AT TIME ZONE $2)::date) AND (t.fim_em IS NULL OR t.fim_em >= (NOW() AT TIME ZONE $2)::date) AND EXTRACT(DOW FROM NOW() AT TIME ZONE $2)::int=ANY(t.dias_semana) ORDER BY t.id`, [alunoId, FUSO_TREINO]),
  ]);
  return { ...semana.rows[0], sessao_ativa: ativa.rows[0] || null, treinos_hoje: hoje.rows, fuso: FUSO_TREINO };
}

export function chaveExercicio(ex, treinoId, indice = 0) {
  if (ex.chave_exercicio) return ex.chave_exercicio;
  return ex.catalogo_id ? `catalogo:${ex.catalogo_id}` : `manual:${treinoId}:${ex.id_exercicio || `${normalizarBusca(ex.nome)}:${indice}`}`;
}
export function metricas(ex) {
  const series = ex.series.filter(s => s.concluida);
  const cargas = series.filter(s => Number.isFinite(s.carga)).map(s => s.carga);
  const repeticoesInformadas = series.every(s => Number.isFinite(s.repeticoes));
  return { carga_maxima: cargas.length ? Math.max(...cargas) : 0,
    volume: repeticoesInformadas && cargas.length === series.length ? Math.round(series.reduce((n, s) => n + s.carga * s.repeticoes, 0) * 100) / 100 : null,
    repeticoes: repeticoesInformadas ? series.reduce((n, s) => n + s.repeticoes, 0) : null, series: series.length };
}
export function compararExercicios(exercicios, anterior) {
  if (!anterior) return exercicios;
  return exercicios.map(ex => {
    // Primeiro a instância da ficha. Para fichas antigas, apenas um candidato inequívoco.
    const candidatos = anterior.exercicios.filter((a, i) => chaveExercicio(a, anterior.treino_id, i) === ex.chave_exercicio);
    const a = candidatos.find(a => a.id_exercicio && a.id_exercicio === ex.id_exercicio) || (candidatos.length === 1 ? candidatos[0] : null);
    return { ...ex, anterior: a ? { sessao_id: anterior.id, data: anterior.finalizada_em, ...metricas(a), series: a.series } : null };
  });
}
export function agruparEvolucao(sessoes) {
  const grupos = new Map();
  for (const s of sessoes) {
    const porSessao = new Map();
    s.exercicios.forEach((ex, i) => {
      const chave = chaveExercicio(ex, s.treino_id || `excluido-${s.id}`, i);
      const anterior = porSessao.get(chave);
      porSessao.set(chave, anterior ? { ...anterior, series: [...anterior.series, ...ex.series] } : ex);
    });
    for (const [chave, ex] of porSessao) {
      if (!grupos.has(chave)) grupos.set(chave, { chave, nome: ex.nome, pontos: [] });
      const grupo = grupos.get(chave);
      if (grupo.pontos.length < 30) grupo.pontos.push({ sessao_id: s.id, data: s.finalizada_em, ...metricas(ex) });
    }
  }
  return [...grupos.values()].map(g => ({ ...g, pontos: g.pontos.reverse() }));
}
