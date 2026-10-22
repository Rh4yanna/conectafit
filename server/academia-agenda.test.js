import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
test('agenda: persistência, conflitos, edição, cancelamento e isolamento',async()=>{
 const app=await servidorIsolado();try{
  for(const id of [1,2])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Academia',$2,'teste','academia')`,[id,`${id}@teste.invalid`]);
  const tokens={1:await app.token(1),2:await app.token(2)};
  async function req(path,method='GET',body,id=1){const r=await fetch(app.base+'/api/operacao-academia'+path,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const inicio=new Date(Date.now()+86400000).toISOString(),fim=new Date(Date.now()+90000000).toISOString();
  const b={titulo:'Avaliação inicial',tipo:'avaliacao',responsavel:'Ana',inicio,fim,observacao:'Primeira avaliação'};
  const salvo=await req('/agenda','POST',b);assert.equal(salvo.status,200);
  const mes=inicio.slice(0,7);assert.equal((await req(`/agenda?mes=${mes}`)).d.length,1);
  assert.equal((await req(`/agenda?mes=${mes}`,'GET',null,2)).d.length,0);
  assert.equal((await req('/agenda','POST',b)).status,409);
  assert.equal((await req('/agenda','POST',{...b,id:salvo.d.id,versao:1},2)).status,404);
  assert.equal((await req('/turmas','POST',{nome:'Turma',local:'Sala',professor:'Ana',inicio,fim,vagas:5})).status,409);
  const editado=await req('/agenda','POST',{...salvo.d,titulo:'Reavaliação'});assert.equal(editado.status,200);assert.equal(editado.d.versao,2);
  assert.equal((await req('/agenda','POST',{...salvo.d,titulo:'Antigo'})).status,409);
  assert.equal((await req(`/agenda/${salvo.d.id}`,'DELETE',{versao:2,motivo:'Solicitação do aluno'})).status,200);
  assert.equal((await req(`/agenda?mes=${mes}`)).d[0].cancelado,true);
  assert.equal((await req('/agenda','POST',b)).status,200);
  const periodo=`/agenda/periodo?inicio=${inicio.slice(0,10)}&fim=${fim.slice(0,10)}`;
  assert.equal((await req(periodo)).d.length,2);
  assert.equal((await req(periodo,'GET',null,2)).d.length,0);
  assert.equal((await req('/agenda/periodo?inicio=2026-01-01&fim=2026-12-31')).status,400);
  await app.db.query(`INSERT INTO ${app.schema}.turmas_academia(academia_id,nome,inicio,fim,vagas,local,professor) SELECT 1,'Turma '||n,$1,$2,5,'Sala','Professor' FROM generate_series(1,205) n`,[inicio,fim]);
  const todos=(await req(periodo)).d;assert.equal(todos.filter(r=>r.turma).length,205);
  assert.equal((await req('/agenda?mes=errado')).status,400);
 }finally{await app.fechar();}
});
