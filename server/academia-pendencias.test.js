import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('pendências: solicitações, recorrência, correções, equipe, carrinho e devoluções',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo]of [[1,'academia'],[2,'academia'],[3,'personal'],[4,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'professor',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3,4].map(async id=>[id,await app.token(id)])));
  async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  async function ok(path,method='GET',body){const r=await req(path,method,body);assert.ok(r.status<300,JSON.stringify(r));return r.d;}
  const uuid=()=>crypto.randomUUID(),hoje=hojeEvolucao();
  // Trigger real, isolado pelo search_path: solicitações repetidas compartilham o lead.
  for(let n=0;n<2;n++)await app.db.query(`INSERT INTO ${app.schema}.solicitacoes_academia(aluno_id,academia_id,chave_cliente,tipo,data,horario,oferta) VALUES(4,1,$1,$3,$2,'10:00','{}')`,[uuid(),hoje,n?'experimental':'visita']);
  const leads=await ok('/leads');assert.equal(leads.length,1);assert.equal(leads[0].solicitacoes.length,2);assert.equal(leads[0].interacoes.length,2);
  const conta={descricao:'Recorrente',fornecedor:'Fornecedor',categoria:'outros',valor:10,vencimento:'2027-01-31',repeticoes:3,chave_cliente:uuid()};
  const c=await ok('/contas-pagar','POST',conta);assert.equal((await ok('/contas-pagar','POST',conta)).id,c.id);
  const contas=await ok('/contas-pagar?inicio=2027-01-01&fim=2027-03-31');assert.deepEqual(contas.map(c=>c.vencimento),['2027-01-31','2027-02-28','2027-03-31']);assert.equal(contas.length,3);
  const m=await ok('/matriculas','POST',{nome:'Avaliado',email:'avaliado@teste.invalid'});
  const av={matricula_id:m.id,data:hoje,responsavel:'Pessoa 3',medidas:{peso:80},chave_cliente:uuid()};const a=await ok('/avaliacoes','POST',av);
  const corr={...av,medidas:{peso:79},corrige_id:a.id,motivo_correcao:'Erro de digitação',chave_cliente:uuid()};const nova=await ok('/avaliacoes','POST',corr);assert.equal((await ok('/avaliacoes','POST',corr)).id,nova.id);assert.equal((await req('/avaliacoes','POST',{...corr,chave_cliente:uuid()})).status,409);
  const hist=await ok(`/avaliacoes?matricula_id=${m.id}`);assert.equal(hist.find(v=>v.id===a.id).medidas.peso,80);assert.equal(hist.find(v=>v.id===a.id).substituida_por,nova.id);
  const agenda={titulo:'Equipe',tipo:'compromisso',responsavel_id:3,inicio:'2027-01-01T10:00:00-03:00',fim:'2027-01-01T11:00:00-03:00'};
  const ag=await ok('/agenda','POST',agenda);assert.equal(String(ag.responsavel_id),'3');assert.equal(ag.responsavel,'Pessoa 3');assert.equal((await req('/agenda','POST',{...agenda,responsavel_id:2})).status,400);
  await app.db.query(`UPDATE ${app.schema}.usuarios SET nome='Nome novo' WHERE id=3`);assert.equal((await req('/agenda','POST',agenda)).status,409);
  const produtos=[];for(const nome of ['Produto A','Produto B']){const p=await ok('/estoque/produtos','POST',{nome,categoria:'Geral',custo:1,preco:10,minimo:0,ativo:true});await ok('/estoque/movimentos','POST',{produto_id:p.id,tipo:'entrada',quantidade:10,motivo:'Inicial',chave_cliente:uuid()});produtos.push(p);}
  const pedido={cliente:'Cliente',parcelas:3,vencimento:hoje,chave_cliente:uuid(),itens:produtos.map((p,n)=>({produto_id:p.id,quantidade:n+2,preco:10}))};
  const v=await ok('/vendas','POST',pedido);assert.equal((await ok('/vendas','POST',pedido)).id,v.id);assert.equal((await req('/vendas','POST',{...pedido,cliente:'Outro'})).status,409);assert.equal((await req('/vendas','GET',null,3)).status,403);
  let venda=(await ok('/vendas'))[0];assert.equal(venda.parcelas.reduce((s,p)=>s+Math.round(Number(p.valor)*100),0),5000);assert.equal((await ok('/estoque')).find(p=>p.id===produtos[0].id).quantidade,8);
  const receber={parcela_id:venda.parcelas[0].id,valor:venda.parcelas[0].valor,data:hoje,chave_cliente:uuid()};
  const recebimentos=await Promise.all([ok(`/vendas/${v.id}/receber`,'POST',receber),ok(`/vendas/${v.id}/receber`,'POST',receber)]);assert.equal(recebimentos[0].id,recebimentos[1].id);
  const devolucao={item_id:venda.itens[0].id,quantidade:1,motivo:'Devolução parcial',chave_cliente:uuid()};const d=await ok(`/vendas/${v.id}/devolver`,'POST',devolucao);assert.equal(Number(d.reembolso),0);assert.equal((await ok(`/vendas/${v.id}/devolver`,'POST',devolucao)).id,d.id);
  venda=(await ok('/vendas'))[0];for(const p of venda.parcelas){const saldo=Number(p.valor)-Number(p.recebido);if(saldo>0)await ok(`/vendas/${v.id}/receber`,'POST',{parcela_id:p.id,valor:saldo.toFixed(2),data:hoje,chave_cliente:uuid()});}
  const reembolso=await ok(`/vendas/${v.id}/devolver`,'POST',{...devolucao,chave_cliente:uuid()});assert.equal(Number(reembolso.reembolso),10);assert.equal((await req(`/vendas/${v.id}/devolver`,'POST',{...devolucao,chave_cliente:uuid()})).status,400);
  assert.equal((await req(`/vendas/${v.id}/receber`,'POST',receber,2,2)).status,404);
  venda=(await ok('/vendas'))[0];assert.equal(venda.parcelas.reduce((s,p)=>s+Number(p.valor),0),30);assert.equal(venda.parcelas.reduce((s,p)=>s+Number(p.recebido),0),30);
  const caixa=await ok(`/financeiro?inicio=${hoje}&fim=${hoje}`);assert.equal(caixa.lancamentos.reduce((s,l)=>s+(l.tipo==='receita'?1:-1)*Math.round(Number(l.valor)*100),0),3000);
  const rel=await ok(`/relatorios?inicio=${hoje}&fim=${hoje}`);assert.equal(Number(rel.comparacao.atual.caixa),30);assert.equal(Number(rel.comparacao.anterior.caixa),0);
 }finally{await app.fechar();}
});
