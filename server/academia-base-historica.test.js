import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
test('base histórica: cancelamento, reativação, vencimento, lacunas e isolamento',async()=>{
 const app=await servidorIsolado();try{
  for(const id of [1,2])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Academia',$2,'teste','academia')`,[id,`${id}@teste.invalid`]);
  const token=await app.token(1);
  const m=(await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email,criado_em,situacao,inicio,termino) VALUES(1,'Aluno','a@teste.invalid','2001-01-01T12:00:00-03:00','ativa','2001-01-01','2001-01-06') RETURNING id`)).rows[0];
  for(const [quando,situacao]of [['2001-01-01T12:00:00-03:00','ativa'],['2001-01-03T10:00:00-03:00','cancelada'],['2001-01-05T09:00:00-03:00','ativa']])await app.db.query(`INSERT INTO ${app.schema}.auditoria_academia(academia_id,autor_id,entidade,registro_id,acao,motivo,depois,criado_em) VALUES(1,1,'matricula',$1,'situacao','Teste',$2,$3)`,[m.id,{situacao,inicio:'2001-01-01',termino:'2001-01-06'},quando]);
  async function consultar(){const r=await fetch(app.base+'/api/operacao-academia/relatorios?unidade=1&inicio=2001-01-01&fim=2001-01-07',{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d.base_historica;}
  assert.deepEqual((await consultar()).map(d=>d.ativas),[1,1,0,0,1,1,0]);
  await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email,criado_em) VALUES(2,'Outra','b@teste.invalid','2001-01-01')`);
  assert.deepEqual((await consultar()).map(d=>d.ativas),[1,1,0,0,1,1,0]);
  await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email,criado_em) VALUES(1,'Sem histórico','c@teste.invalid','2001-01-04T12:00:00-03:00')`);
  const incompleto=await consultar();assert.deepEqual(incompleto.map(d=>d.ativas),[1,1,0,null,null,null,null]);assert.equal(incompleto[3].sem_historico,1);assert.equal(incompleto[4].ativas_conhecidas,1);
 }finally{await app.fechar();}
});
