import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';

test('feedbacks da academia respeitam unidade, função e paginação',async()=>{
 const app=await servidorIsolado();try{
  await app.db.query(`CREATE TABLE ${app.schema}.feedbacks_academia (id bigserial PRIMARY KEY,academia_id bigint NOT NULL,matricula_id bigint NOT NULL,nota smallint NOT NULL,comentario text NOT NULL DEFAULT '',foto_url text,criado_em timestamptz NOT NULL DEFAULT now())`);
  await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES (1,'Academia','a@teste.invalid','x','academia'),(2,'Outra','b@teste.invalid','x','academia'),(3,'Recepção','c@teste.invalid','x','aluno')`);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
  const m=(await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email) VALUES(1,'Aluno','aluno@teste.invalid'),(2,'Outro','outro@teste.invalid') RETURNING id,academia_id`)).rows;
  await app.db.query(`INSERT INTO ${app.schema}.feedbacks_academia(academia_id,matricula_id,nota,comentario) VALUES (1,$1,5,'Muito bom'),(2,$2,2,'Outro')`,[m[0].id,m[1].id]);
  const token=await app.token(1),outro=await app.token(2),recepcao=await app.token(3);
  const req=async(t,query='')=>{const r=await fetch(`${app.base}/api/operacao-academia/feedbacks-academia?unidade=1${query}`,{headers:{Authorization:`Bearer ${t}`}});return {status:r.status,data:await r.json()};};
  const r=await req(token);assert.equal(r.status,200);assert.equal(r.data.feedbacks.length,1);assert.equal(r.data.feedbacks[0].aluno_nome,'Aluno');assert.equal(r.data.feedbacks[0].nota,5);
  assert.equal((await req(outro)).status,403);assert.equal((await req(recepcao)).status,403);assert.equal((await req(token,'&offset=-1')).status,400);
 }finally{await app.fechar();}
});
