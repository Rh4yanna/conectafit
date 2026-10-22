import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('fluxo: concorrência, presença única, saída e isolamento',async()=>{
 const app=await servidorIsolado();try{
  for(const id of [1,2])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Academia',$2,'teste','academia')`,[id,`${id}@teste.invalid`]);
  const tokens={1:await app.token(1),2:await app.token(2)};
  async function req(path,method='GET',body,id=1){const r=await fetch(app.base+'/api/operacao-academia'+path,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const m=(await req('/matriculas','POST',{nome:'Aluno Teste',email:'aluno@teste.invalid'})).d;
  const entradas=await Promise.all([req('/fluxo/entrada','POST',{matricula_id:m.id}),req('/fluxo/entrada','POST',{matricula_id:m.id})]);assert.deepEqual(entradas.map(r=>r.status).sort(),[201,409]);
  const entrada=entradas.find(r=>r.status===201).d,hoje=hojeEvolucao(),path=`/fluxo?inicio=${hoje}&fim=${hoje}`;
  assert.equal((await req(path)).d.presentes.length,1);
  assert.equal((await req(path,'GET',null,2)).d.presentes.length,0);
  assert.equal((await req(`/fluxo/${entrada.id}/saida`,'POST',{},2)).status,404);
  assert.equal((await req('/fluxo/entrada','POST',{matricula_id:m.id},2)).status,404);
  const saida=(await req(`/fluxo/${entrada.id}/saida`,'POST',{})).d;
  assert.equal((await req(`/fluxo/${entrada.id}/saida`,'POST',{})).d.saida,saida.saida);
  assert.equal((await req(path)).d.presentes.length,0);
  assert.equal((await req('/fluxo/entrada','POST',{matricula_id:m.id})).status,201);
  assert.equal((await req(`/presencas?inicio=${hoje}&fim=${hoje}`)).d.length,1);
  assert.equal((await req(path)).d.resumo.entradas,2);
  assert.equal((await req(path)).d.resumo.alunos,1);
  await req(`/matriculas/${m.id}`,'PATCH',{situacao:'inativa',versao:m.versao,motivo:'Encerramento'});
  const aberto=(await req(path)).d.presentes[0];assert.equal((await req(`/fluxo/${aberto.id}/saida`,'POST',{})).status,200);
  assert.equal((await req('/fluxo/entrada','POST',{matricula_id:m.id})).status,400);
 }finally{await app.fechar();}
});
