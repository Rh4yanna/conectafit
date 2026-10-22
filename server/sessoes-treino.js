import { Router } from 'express';
import { exercicioCatalogo } from './biblioteca-exercicios.js';
import { chaveExercicio, compararExercicios, agruparEvolucao, resumoTreinos } from './progresso-treinos.js';

const abertas = ['em_andamento', 'pausada'];
const numero = (v, max, inteiro = false) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max && (!inteiro || Number.isInteger(v));
function erro(message, status = 400) { return Object.assign(new Error(message), { status }); }

export function prepararExercicios(valor) {
  let lista;
  try { lista = typeof valor === 'string' ? JSON.parse(valor) : valor; } catch { throw erro('Ficha inválida. Revise os exercícios antes de iniciar.'); }
  if (!Array.isArray(lista) || !lista.length || lista.length > 50) throw erro('A ficha precisa ter entre 1 e 50 exercícios.');
  return lista.map(ex => {
    const quantidade = Number(ex.series);
    if (typeof ex.nome !== 'string' || !ex.nome.trim() || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 30) {
      throw erro('Cada exercício precisa de nome e de 1 a 30 séries. Revise a ficha antes de iniciar.');
    }
    return {
      id_exercicio: ex.id_exercicio || null, catalogo_id: ex.catalogo_id || null,
      demonstracao: ex.demonstracao_catalogo || (ex.catalogo_id ? exercicioCatalogo(ex.catalogo_id) : null),
      demonstracao_propria: ex.demonstracao_propria || null, variacao: ex.variacao || '', equipamento: ex.equipamento || '',
      nome: ex.nome.trim(), prescricao: { descanso_segundos: ex.descanso_segundos ?? null, series: quantidade, repeticoes: String(ex.repeticoes ?? ''), carga: String(ex.carga ?? ''), orientacoes: String(ex.orientacoes ?? '') },
      observacoes: '', series: Array.from({ length: quantidade }, () => ({ carga: null, repeticoes: null, concluida: false })),
    };
  });
}

export function validarRegistro(originais, enviados, observacoes, status) {
  if (['concluida', 'incompleta'].includes(status) && (typeof observacoes !== 'string' || !observacoes.trim())) throw erro('Conte como foi o treino antes de finalizar.');
  if (typeof observacoes !== 'string' || observacoes.length > 2000) throw erro('Use até 2.000 caracteres no relato da sessão.');
  if (!Array.isArray(enviados) || enviados.length !== originais.length) throw erro('A estrutura da sessão não pode ser alterada.');
  const exercicios = originais.map((original, i) => {
    const ex = enviados[i];
    if (!ex || typeof ex.observacoes !== 'string' || ex.observacoes.length > 1000 || !Array.isArray(ex.series) || ex.series.length !== original.series.length) throw erro('Registro de exercício inválido.');
    const series = ex.series.map(s => {
      if (!s || typeof s.concluida !== 'boolean' || (s.carga !== null && !numero(s.carga, 2000)) || (s.repeticoes !== null && !numero(s.repeticoes, 1000, true))) throw erro('Informe carga de 0 a 2.000 kg e repetições inteiras de 0 a 1.000.');
      if (s.concluida && s.repeticoes === 0) throw erro('Se informar repetições em uma série concluída, use pelo menos 1 ou deixe o campo vazio.');
      return { carga: s.carga, repeticoes: s.repeticoes, concluida: s.concluida };
    });
    return { ...original, observacoes: ex.observacoes.trim(), series };
  });
  if (status === 'concluida' && !exercicios.every(ex => ex.series.every(s => s.concluida))) throw erro('Conclua todas as séries ou encerre como treino incompleto.');
  return exercicios;
}

export function rotasSessoesTreino(db) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/resumo', async (req, res) => {
    try { res.json(await resumoTreinos(db, req.usuario.id)); }
    catch { res.status(500).json({ message: 'Não foi possível carregar a programação de treinos.' }); }
  });
  router.get('/evolucao', async (req, res) => {
    try {
      const r = await db.query("SELECT id,treino_id,finalizada_em,exercicios FROM sessoes_treino WHERE aluno_id=$1 AND status='concluida' AND finalizada_em>=NOW()-INTERVAL '180 days' ORDER BY finalizada_em DESC,id DESC", [req.usuario.id]);
      res.json({ exercicios: agruparEvolucao(r.rows), dias: 180, limite_por_exercicio: 30 });
    } catch { res.status(500).json({ message: 'Não foi possível carregar a evolução.' }); }
  });
  router.get('/', async (req, res) => {
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ message: 'Página inválida.' });
    try {
      const [ativa, historico, total] = await Promise.all([
        db.query("SELECT * FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('em_andamento','pausada')", [req.usuario.id]),
        db.query("SELECT * FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('concluida','incompleta') ORDER BY iniciada_em DESC,id DESC LIMIT 4 OFFSET $2", [req.usuario.id, offset]),
        db.query("SELECT COUNT(*)::int AS total FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('concluida','incompleta')", [req.usuario.id]),
      ]);
      res.json({ ativa: ativa.rows[0] || null, historico: historico.rows.slice(0, 3), temMais: historico.rows.length > 3, total: total.rows[0].total });
    } catch { res.status(500).json({ message: 'Não foi possível carregar as sessões.' }); }
  });
  router.delete('/historico', async (req, res) => {
    const { todos, ids } = req.body || {};
    if (todos !== true && (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(id => !/^\d+$/.test(String(id))) || new Set(ids.map(String)).size !== ids.length)) return res.status(400).json({ message: 'Selecione os treinos que deseja excluir.' });
    let client;
    try {
      client = await db.connect(); await client.query('BEGIN');
      const selecionados = await client.query("SELECT id FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('concluida','incompleta')" + (todos === true ? '' : ' AND id=ANY($2::bigint[])') + ' FOR UPDATE', todos === true ? [req.usuario.id] : [req.usuario.id, ids]);
      if (todos !== true && selecionados.rows.length !== ids.length) throw erro('Um dos registros não está disponível para exclusão. Atualize o histórico.', 409);
      const removidos = await client.query('DELETE FROM sessoes_treino WHERE aluno_id=$1 AND id=ANY($2::bigint[])', [req.usuario.id, selecionados.rows.map(s => s.id)]);
      await client.query('COMMIT');
      res.json({ removidos: removidos.rowCount, message: 'Histórico selecionado excluído com sucesso.' });
    } catch (e) {
      if (client) await client.query('ROLLBACK');
      res.status(e.status || 500).json({ message: e.status ? e.message : 'Não foi possível excluir o histórico.' });
    } finally { client?.release(); }
  });
  router.post('/', async (req, res) => {
    if (!/^\d+$/.test(String(req.body.treino_id))) return res.status(400).json({ message: 'Ficha inválida.' });
    let client;
    try {
      client = await db.connect(); await client.query('BEGIN');
      // Serializa inícios do mesmo aluno, inclusive em abas ou pedidos simultâneos.
      await client.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [req.usuario.id]);
      const ativa = await client.query("SELECT * FROM sessoes_treino WHERE aluno_id=$1 AND status IN ('em_andamento','pausada')", [req.usuario.id]);
      if (ativa.rows.length) {
        await client.query('COMMIT');
        return res.status(String(ativa.rows[0].treino_id) === String(req.body.treino_id) ? 200 : 409).json({ sessao: ativa.rows[0], message: 'Você já tem uma sessão aberta. Retome ou encerre essa sessão primeiro.' });
      }
      const ficha = await client.query(`SELECT * FROM treinos WHERE id=$1 AND usuario_id=$2 AND NOT arquivada AND (inicio_em IS NULL OR inicio_em <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date) AND (fim_em IS NULL OR fim_em >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date) FOR SHARE`, [req.body.treino_id, req.usuario.id]);
      if (!ficha.rows.length) throw erro('Ficha indisponível: confira o período da programação e se ela foi arquivada.', 404);
      const t = ficha.rows[0];
      const anterior = await client.query("SELECT id,treino_id,finalizada_em,exercicios FROM sessoes_treino WHERE aluno_id=$1 AND treino_id=$2 AND status='concluida' ORDER BY finalizada_em DESC,id DESC LIMIT 1", [req.usuario.id, t.id]);
      const base = prepararExercicios(t.exercicios).map((ex, i) => ({ ...ex, chave_exercicio: chaveExercicio(ex, t.id, i) }));
      const exercicios = compararExercicios(base, anterior.rows[0]);
      const r = await client.query('INSERT INTO sessoes_treino(aluno_id,treino_id,titulo,exercicios) VALUES($1,$2,$3,$4) RETURNING *', [req.usuario.id, t.id, t.titulo, JSON.stringify(exercicios)]);
      await client.query('COMMIT'); res.status(201).json({ sessao: r.rows[0] });
    } catch (e) { if (client) await client.query('ROLLBACK'); res.status(e.status || 500).json({ message: e.status ? e.message : 'Não foi possível iniciar o treino.' }); }
    finally { client?.release(); }
  });
  router.put('/:id', async (req, res) => {
    const { versao, exercicios, observacoes, status } = req.body;
    if (!/^\d+$/.test(req.params.id) || !Number.isInteger(versao) || ![...abertas, 'concluida', 'incompleta'].includes(status)) return res.status(400).json({ message: 'Registro de sessão inválido.' });
    let client;
    try {
      client = await db.connect(); await client.query('BEGIN');
      const r = await client.query('SELECT * FROM sessoes_treino WHERE id=$1 AND aluno_id=$2 FOR UPDATE', [req.params.id, req.usuario.id]);
      if (!r.rows.length) throw erro('Sessão não encontrada.', 404);
      const atual = r.rows[0];
      if (atual.versao !== versao || !abertas.includes(atual.status)) throw erro('A sessão foi atualizada ou encerrada. Recarregue os dados antes de continuar.', 409);
      const registro = validarRegistro(atual.exercicios, exercicios, observacoes, status);
      const final = !abertas.includes(status);
      const relato = {};
      for (const k of ['dificuldade','satisfacao']) {
        const v = req.body[k] === undefined ? atual[k] : req.body[k];
        if (v != null && (!Number.isInteger(v) || v < 1 || v > 5)) throw erro('Use uma nota inteira de 1 a 5 ou deixe sem informar.');
        relato[k] = v ?? null;
      }
      for (const k of ['sensacao_durante','sensacao_apos']) {
        const v = req.body[k] === undefined ? atual[k] : req.body[k];
        if (typeof v !== 'string' || v.length > 1000) throw erro('Use até 1.000 caracteres por relato.');
        relato[k] = v.trim();
      }
      const novo = await client.query(`UPDATE sessoes_treino SET exercicios=$1,observacoes=$2,status=$3::varchar,versao=versao+1,atualizada_em=NOW(),
        segundos_ativos=segundos_ativos+CASE WHEN status='em_andamento' THEN GREATEST(0,FLOOR(EXTRACT(EPOCH FROM NOW()-retomada_em)))::int ELSE 0 END,
        retomada_em=CASE WHEN $3::varchar='em_andamento' THEN NOW() ELSE NULL END,
        finalizada_em=CASE WHEN $4 THEN NOW() ELSE NULL END, dificuldade=$6,satisfacao=$7,sensacao_durante=$8,sensacao_apos=$9 WHERE id=$5 RETURNING *`,
      [JSON.stringify(registro), observacoes.trim(), status, final, atual.id, relato.dificuldade, relato.satisfacao, relato.sensacao_durante, relato.sensacao_apos]);
      await client.query('COMMIT'); res.json({ sessao: novo.rows[0] });
    } catch (e) { if (client) await client.query('ROLLBACK'); if (!e.status) console.error('Erro ao salvar sessão:', e.message); res.status(e.status || 500).json({ message: e.status ? e.message : 'Não foi possível salvar. Seus registros continuam disponíveis na tela.' }); }
    finally { client?.release(); }
  });
  return router;
}
