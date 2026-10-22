import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('contas a pagar: quitação, estorno, concorrência e isolamento',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo]of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)])));
  async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const hoje=hojeEvolucao(),b={descricao:'Aluguel',fornecedor:'Proprietário',categoria:'aluguel',valor:100,vencimento:hoje,chave_cliente:crypto.randomUUID()};
  const c=(await req('/contas-pagar','POST',b)).d;assert.ok(c.id);assert.equal((await req('/contas-pagar','POST',b)).d.id,c.id);
  assert.equal((await req('/contas-pagar','POST',{...b,chave_cliente:crypto.randomUUID()})).status,409);
  const pagamento={valor:40,data:hoje,chave_cliente:crypto.randomUUID()};const rs=await Promise.all([req(`/contas-pagar/${c.id}/pagamento`,'POST',pagamento),req(`/contas-pagar/${c.id}/pagamento`,'POST',pagamento)]);assert.ok(rs.every(r=>r.status===200));assert.equal(rs[0].d.id,rs[1].d.id);
  const path=`/contas-pagar?inicio=${hoje}&fim=${hoje}`;let atual=(await req(path)).d[0];assert.equal(Number(atual.saldo),60);assert.equal(atual.status,'parcial');
  const edicao={...b,versao:atual.versao,motivo:'Corrigir fornecedor',fornecedor:'Fornecedor corrigido'};
  assert.equal((await req(`/contas-pagar/${c.id}/editar`,'POST',{...edicao,valor:39})).status,400);
  assert.equal((await req(`/contas-pagar/${c.id}/editar`,'POST',edicao,3)).status,403);
  assert.equal((await req(`/contas-pagar/${c.id}/editar`,'POST',edicao,2,2)).status,404);
  assert.equal((await req(`/contas-pagar/${c.id}/editar`,'POST',edicao)).status,200);
  assert.equal((await req(`/contas-pagar/${c.id}/editar`,'POST',edicao)).status,409);
  atual=(await req(path)).d[0];assert.equal(atual.fornecedor,'Fornecedor corrigido');assert.equal(Number(atual.pago),40);assert.equal(String(atual.pagamentos[0].id),String(rs[0].d.id));
  assert.equal((await req(`/contas-pagar/${c.id}/pagamento`,'POST',{...pagamento,valor:61,chave_cliente:crypto.randomUUID()})).status,400);
  assert.equal((await req(`/contas-pagar/${c.id}/cancelar`,'POST',{versao:atual.versao,motivo:'Erro'})).status,400);
  await req(`/lancamentos/${rs[0].d.id}/estorno`,'POST',{data:hoje,motivo:'Pagamento incorreto'});atual=(await req(path)).d[0];assert.equal(Number(atual.saldo),100);assert.equal(atual.pagamentos[0].estornado_por!=null,true);
  const f=(await req(`/financeiro?inicio=${hoje}&fim=${hoje}`)).d;assert.equal(f.lancamentos.length,2);assert.equal(f.lancamentos.filter(l=>l.tipo==='despesa').length,1);
  assert.equal((await req(path,'GET',null,3)).status,403);assert.equal((await req(path,'GET',null,2,2)).d.length,0);
  assert.equal((await req(`/contas-pagar/${c.id}/pagamento`,'POST',pagamento,2,2)).status,404);
  assert.equal((await req(`/contas-pagar/${c.id}/cancelar`,'POST',{versao:atual.versao,motivo:'Cadastro corrigido'})).status,200);
  assert.equal((await req(`/contas-pagar/${c.id}/pagamento`,'POST',{...pagamento,chave_cliente:crypto.randomUUID()})).status,400);
 }finally{await app.fechar();}
});
