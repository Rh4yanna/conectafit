import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('estoque: venda atômica, saldo, estorno e permissões',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)])));
  async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const p=(await req('/estoque/produtos','POST',{nome:'Água',categoria:'Bebidas',custo:2,preco:5,minimo:2,ativo:true})).d;assert.ok(p.id);
  const entrada={produto_id:p.id,tipo:'entrada',quantidade:3,motivo:'Compra',chave_cliente:crypto.randomUUID()};assert.equal((await req('/estoque/movimentos','POST',entrada)).status,201);assert.equal((await req('/estoque/movimentos','POST',entrada)).status,201);assert.equal((await req('/estoque')).d[0].quantidade,3);
  const venda={produto_id:p.id,tipo:'venda',quantidade:2,motivo:'Balcão',preco_confirmado:5,chave_cliente:crypto.randomUUID()};
  const respostas=await Promise.all([req('/estoque/movimentos','POST',venda),req('/estoque/movimentos','POST',venda)]);assert.ok(respostas.every(r=>r.status===201));assert.equal(respostas[0].d.id,respostas[1].d.id);assert.equal((await req('/estoque')).d[0].quantidade,1);
  assert.equal((await req('/estoque/movimentos','POST',{...venda,chave_cliente:crypto.randomUUID()})).status,409);
  const hoje=hojeEvolucao(),f=(await req(`/financeiro?inicio=${hoje}&fim=${hoje}`)).d;assert.equal(f.lancamentos.length,1);assert.equal(Number(f.lancamentos[0].valor),10);
  assert.equal((await req(`/lancamentos/${respostas[0].d.lancamento_id}/estorno`,'POST',{data:hoje,motivo:'Produto devolvido'})).status,200);assert.equal((await req('/estoque')).d[0].quantidade,3);
  assert.equal((await req(`/lancamentos/${respostas[0].d.lancamento_id}/estorno`,'POST',{data:hoje,motivo:'Repetido'})).status,409);assert.equal((await req('/estoque')).d[0].quantidade,3);
  assert.equal((await req('/estoque','GET',null,3)).status,403);assert.equal((await req('/estoque/movimentos','POST',entrada,2,2)).status,404);
  assert.equal((await req('/estoque','GET',null,2,2)).d.length,0);
 }finally{await app.fechar();}
});
