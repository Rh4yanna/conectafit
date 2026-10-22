import {motivoBloqueio} from './academia-regras.js';
import {Router} from 'express';
import {rota,erro,tx,matricula,ativa,data,auditar} from './academia-core.js';
export function rotasFluxoAcademia(db){
 const r=Router();
 r.get('/fluxo',rota(async(q,s)=>{
  const inicio=data(q.query.inicio),fim=data(q.query.fim),offset=Number(q.query.offset||0);
  if(fim<inicio||Date.parse(fim)-Date.parse(inicio)>366*86400000||!Number.isSafeInteger(offset)||offset<0)throw erro('Confira o período (até um ano) e a página.');
  const filtro="a.academia_id=$1 AND a.entrada>=($2::date AT TIME ZONE 'America/Sao_Paulo') AND a.entrada<(($3::date+interval '1 day') AT TIME ZONE 'America/Sao_Paulo')";
  const valores=[q.unidade,inicio,fim];
  const [presentes,historico,resumo,horarios]=await Promise.all([
   db.query('SELECT a.*,m.aluno_nome FROM acessos_academia a JOIN matriculas_academia m ON m.id=a.matricula_id WHERE a.academia_id=$1 AND a.saida IS NULL ORDER BY a.entrada',[q.unidade]),
   db.query(`SELECT a.*,m.aluno_nome,u.nome AS registrado_por,v.nome AS saida_por FROM acessos_academia a JOIN matriculas_academia m ON m.id=a.matricula_id JOIN usuarios u ON u.id=a.autor_entrada LEFT JOIN usuarios v ON v.id=a.autor_saida WHERE ${filtro} ORDER BY a.entrada DESC,a.id DESC LIMIT 50 OFFSET $4`,[...valores,offset]),
   db.query(`SELECT count(*)::int AS entradas,count(DISTINCT matricula_id)::int AS alunos FROM acessos_academia a WHERE ${filtro}`,valores),
   db.query(`SELECT extract(hour FROM entrada AT TIME ZONE 'America/Sao_Paulo')::int AS hora,count(*)::int AS entradas FROM acessos_academia a WHERE ${filtro} GROUP BY hora ORDER BY hora`,valores)
  ]);
  s.json({presentes:presentes.rows,historico:historico.rows,resumo:resumo.rows[0],horarios:horarios.rows});
 }));
 r.post('/fluxo/entrada',rota(async(q,s)=>{s.status(201).json(await tx(db,async c=>{
  const m=await matricula(c,q,q.body.matricula_id,true);
  const d=(await c.query("SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia")).rows[0].dia;
  if(!ativa(m,d))throw erro('A matrícula precisa estar ativa e vigente para registrar a entrada.');
  if((await c.query('SELECT id FROM acessos_academia WHERE matricula_id=$1 AND saida IS NULL',[m.id])).rows.length)throw erro('Este aluno já possui uma entrada aberta. Registre a saída antes de uma nova entrada.',409);
  const ciclo=(await c.query('SELECT contrato FROM ciclos_matricula WHERE matricula_id=$1 AND inicio<=$2 AND termino>=$2 ORDER BY inicio DESC LIMIT 1',[m.id,d])).rows[0];
  const momento=(await c.query("SELECT extract(dow FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::int AS dia,to_char(NOW() AT TIME ZONE 'America/Sao_Paulo','HH24:MI') AS hora")).rows[0];
  const entradas=Number((await c.query("SELECT count(*) FROM acessos_academia WHERE matricula_id=$1 AND (entrada AT TIME ZONE 'America/Sao_Paulo')::date=$2",[m.id,d])).rows[0].count);
  const bloqueio=motivoBloqueio(ciclo?.contrato?.regras_acesso,momento.dia,momento.hora,entradas);if(bloqueio)throw erro(bloqueio,409);
  const novo=(await c.query('INSERT INTO acessos_academia(academia_id,matricula_id,autor_entrada) VALUES($1,$2,$3) RETURNING *',[q.unidade,m.id,q.usuario.id])).rows[0];
  const presenca=(await c.query('INSERT INTO presencas_academia(academia_id,matricula_id,data,autor_id) VALUES($1,$2,$3,$4) ON CONFLICT(matricula_id,data) DO UPDATE SET cancelada=false,autor_id=$4 WHERE presencas_academia.cancelada RETURNING *',[q.unidade,m.id,d,q.usuario.id])).rows[0];
  if(presenca)await auditar(c,q,'presenca',presenca.id,'registrar','Presença registrada pela entrada',null,presenca);
  await auditar(c,q,'acesso',novo.id,'entrada','Entrada registrada pela equipe',null,novo);return novo;
 }));}));
 r.post('/fluxo/:id/saida',rota(async(q,s)=>{s.json(await tx(db,async c=>{
  const antes=(await c.query('SELECT * FROM acessos_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[q.params.id,q.unidade])).rows[0];
  if(!antes)throw erro('Entrada não encontrada.',404);if(antes.saida)return antes;
  const novo=(await c.query('UPDATE acessos_academia SET saida=clock_timestamp(),autor_saida=$2 WHERE id=$1 RETURNING *',[antes.id,q.usuario.id])).rows[0];
  await auditar(c,q,'acesso',novo.id,'saida','Saída registrada pela equipe',antes,novo);return novo;
 }));}));
 return r;
}
