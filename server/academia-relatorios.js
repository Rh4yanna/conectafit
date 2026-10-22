import {baseHistorica} from './academia-base-historica.js';
import {Router} from 'express';
import {rota,permitir,data,erro,tx} from './academia-core.js';
export function rotasRelatoriosAcademia(db){
 const r=Router();
 r.get('/relatorios',rota(async(q,s)=>{
  permitir(q,'gestor');const inicio=data(q.query.inicio),fim=data(q.query.fim);
  if(fim<inicio||Date.parse(fim)-Date.parse(inicio)>366*86400000)throw erro('Selecione um período de até um ano.');
  s.json(await tx(db,async c=>{
   await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const v=[q.unidade,inicio,fim];
   const matriculas=(await c.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE situacao='ativa' AND (inicio IS NULL OR inicio<=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date) AND (termino IS NULL OR termino>=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date))::int AS ativas,count(*) FILTER(WHERE situacao='inativa')::int AS inativas,count(*) FILTER(WHERE (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3)::int AS novas,count(*) FILTER(WHERE (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3 AND situacao='cancelada')::int AS novas_canceladas FROM matriculas_academia WHERE academia_id=$1`,v)).rows[0];
   const cancelamentos=(await c.query(`SELECT count(DISTINCT registro_id)::int AS total FROM auditoria_academia WHERE academia_id=$1 AND entidade='matricula' AND depois->>'situacao'='cancelada' AND antes->>'situacao' IS DISTINCT FROM 'cancelada' AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3`,v)).rows[0].total;
   const caixa=(await c.query(`SELECT to_char(data,'YYYY-MM') AS mes,COALESCE(sum(valor) FILTER(WHERE tipo='receita'),0) AS entradas,COALESCE(sum(valor) FILTER(WHERE tipo='despesa'),0) AS saidas FROM lancamentos_academia WHERE academia_id=$1 AND data BETWEEN $2 AND $3 GROUP BY mes ORDER BY mes`,v)).rows;
   const mensalidades=(await c.query(`SELECT count(*)::int AS quantidade,COALESCE(sum(c.valor-c.desconto),0) AS previsto,COALESCE(sum(c.recebido),0) AS recebido,COALESCE(sum(c.valor-c.desconto-c.recebido),0) AS pendente,COALESCE(sum(c.valor-c.desconto-c.recebido) FILTER(WHERE c.vencimento<(NOW() AT TIME ZONE 'America/Sao_Paulo')::date),0) AS vencido FROM mensalidades_academia c JOIN matriculas_academia m ON m.id=c.matricula_id WHERE m.academia_id=$1 AND c.vencimento BETWEEN $2 AND $3`,v)).rows[0];
   const contas=(await c.query('SELECT COALESCE(sum(valor-pago),0) AS pendente FROM contas_pagar_academia WHERE academia_id=$1 AND vencimento BETWEEN $2 AND $3 AND NOT cancelada',v)).rows[0];
   const leads=(await c.query(`SELECT count(*)::int AS novos,count(*) FILTER(WHERE status='convertido')::int AS convertidos FROM leads_academia WHERE academia_id=$1 AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3`,v)).rows[0];
   const planos=(await c.query(`SELECT c.contrato->>'nome' AS nome,count(*)::int AS contratos,count(DISTINCT c.matricula_id)::int AS alunos FROM ciclos_matricula c JOIN matriculas_academia m ON m.id=c.matricula_id WHERE m.academia_id=$1 AND c.inicio BETWEEN $2 AND $3 GROUP BY c.contrato->>'id',c.contrato->>'nome' ORDER BY contratos DESC,nome`,v)).rows;
   const frequencia=(await c.query('SELECT p.data::text,count(*)::int AS presencas FROM presencas_academia p WHERE academia_id=$1 AND NOT cancelada AND data BETWEEN $2 AND $3 GROUP BY data ORDER BY data',v)).rows;
   const movimento=(await c.query(`SELECT extract(isodow FROM entrada AT TIME ZONE 'America/Sao_Paulo')::int AS dia_semana,extract(hour FROM entrada AT TIME ZONE 'America/Sao_Paulo')::int AS hora,count(*)::int AS entradas FROM acessos_academia WHERE academia_id=$1 AND (entrada AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3 GROUP BY dia_semana,hora ORDER BY entradas DESC,dia_semana,hora`,v)).rows;
   const dias=Math.round((Date.parse(fim)-Date.parse(inicio))/86400000)+1;
   const anteriorFim=new Date(Date.parse(inicio)-86400000).toISOString().slice(0,10),anteriorInicio=new Date(Date.parse(inicio)-dias*86400000).toISOString().slice(0,10);
   const consolidar=async(de,ate)=>(await c.query(`SELECT
    (SELECT count(*)::int FROM matriculas_academia WHERE academia_id=$1 AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3) AS alunos,
    (SELECT COALESCE(sum(CASE WHEN tipo='receita' THEN valor ELSE -valor END),0) FROM lancamentos_academia WHERE academia_id=$1 AND data BETWEEN $2 AND $3) AS caixa,
    (SELECT count(*)::int FROM presencas_academia WHERE academia_id=$1 AND NOT cancelada AND data BETWEEN $2 AND $3) AS presencas,
    (SELECT count(*)::int FROM ciclos_matricula c JOIN matriculas_academia m ON m.id=c.matricula_id WHERE m.academia_id=$1 AND c.inicio BETWEEN $2 AND $3) AS contratos`,[q.unidade,de,ate])).rows[0];
   const comparacao={inicio:anteriorInicio,fim:anteriorFim,atual:await consolidar(inicio,fim),anterior:await consolidar(anteriorInicio,anteriorFim)};
   const base_historica=await baseHistorica(c,q.unidade,inicio,fim);
   return {base_historica,comparacao,inicio,fim,gerado_em:new Date().toISOString(),matriculas,cancelamentos,caixa,mensalidades,contas,leads,planos,frequencia,movimento};
  }));
 }));return r;
}
