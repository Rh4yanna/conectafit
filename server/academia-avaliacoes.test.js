import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('avaliações: validação, autoria, duplicidade e permissões',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'personal'],[4,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'professor',true),(1,4,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3,4].map(async id=>[id,await app.token(id)])));
  async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const m=(await req('/matriculas','POST',{nome:'Aluno teste',email:'aluno@teste.invalid'})).d;
  const b={matricula_id:m.id,data:hojeEvolucao(),responsavel:'Professor',medidas:{peso:80,altura:175},objetivos:'Acompanhamento',chave_cliente:crypto.randomUUID()};
  const salvo=await req('/avaliacoes','POST',b,3);assert.equal(salvo.status,201);assert.equal(salvo.d.autor_id,3);
  assert.equal((await req('/avaliacoes','POST',b,3)).d.id,salvo.d.id);
  assert.equal((await req('/avaliacoes','POST',{...b,medidas:{peso:81}},3)).status,409);
  assert.equal((await req('/avaliacoes','POST',{...b,chave_cliente:crypto.randomUUID(),medidas:{peso:-1}},3)).status,400);
  assert.equal((await req('/avaliacoes','POST',{...b,chave_cliente:crypto.randomUUID(),medidas:{}},3)).status,400);
  const path=`/avaliacoes?matricula_id=${m.id}`;
  assert.equal((await req(path)).d.length,1);
  assert.equal((await req(path,'GET',null,4)).status,403);
  assert.equal((await req('/avaliacoes','POST',b,4)).status,403);
  assert.equal((await req(path,'GET',null,2,2)).status,404);
  assert.equal((await req('/avaliacoes','POST',{...b,chave_cliente:crypto.randomUUID()},2,2)).status,404);
 }finally{await app.fechar();}
});
