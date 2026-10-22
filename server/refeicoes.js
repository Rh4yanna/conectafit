export function normalizarRefeicao(ref) {
  if(ref?.orientacoes!=null&&(typeof ref.orientacoes!=='string'||ref.orientacoes.length>2000))throw new Error('Orientações da refeição: use até 2000 caracteres.');
  if (!ref || typeof ref.nome !== 'string' || !ref.nome.trim() || ref.nome.trim().length > 100) throw new Error('Informe o nome da refeição.');
  if (ref.horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(ref.horario)) throw new Error('Horário da refeição inválido.');
  const lista = ref.alimentos ?? [{nome:ref.alimento,quantidade:ref.quantidade_gramas,unidade:'g'}];
  if (Array.isArray(lista) && !lista.length && typeof ref.detalhes==='string' && ref.detalhes.trim() && ref.detalhes.length<=5000) return {nome:ref.nome.trim(),horario:ref.horario||null,alimentos:[],detalhes:ref.detalhes.trim()};
  if (!Array.isArray(lista) || !lista.length || lista.length > 50) throw new Error('Adicione de 1 a 50 alimentos por refeição.');
  const alimentos = lista.map(a => {
    if (!a || typeof a.nome !== 'string' || !a.nome.trim() || a.nome.trim().length > 120 || !['g','ml','un'].includes(a.unidade) || !['string','number'].includes(typeof a.quantidade) || !Number.isFinite(Number(a.quantidade)) || Number(a.quantidade)<=0 || Number(a.quantidade)>5000) throw new Error('Informe alimento, quantidade positiva (até 5000) e unidade: g, ml ou un.');
    return {nome:a.nome.trim(),quantidade:Number(a.quantidade),unidade:a.unidade};
  });
  return {nome:ref.nome.trim(),horario:ref.horario||null,alimentos,orientacoes:ref.orientacoes?.trim()||'',detalhes:alimentos.map(a=>`${a.quantidade} ${a.unidade} de ${a.nome}`).join(', ')};
}

export async function inserirRefeicao(db,planoId,ref,ordem) {
  const r=await db.query(`INSERT INTO refeicoes_plano(plano_id,nome,horario,descricao,alimentos,ordem,orientacoes)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,nome,horario,descricao AS detalhes,alimentos,ordem,orientacoes`,
  [planoId,ref.nome,ref.horario,ref.detalhes,JSON.stringify(ref.alimentos),ordem,ref.orientacoes||'']);
  return r.rows[0];
}

