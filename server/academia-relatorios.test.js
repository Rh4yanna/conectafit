import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('relatórios: totais reais, datas, vazio e permissões',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo]of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)]))),hoje=hojeEvolucao();
  async function req(inicio=hoje,fim=hoje,id=1,unidade=1){const r=await fetch(`${app.base}/api/operacao-academia/relatorios?inicio=${inicio}&fim=${fim}&unidade=${unidade}`,{headers:{Authorization:`Bearer ${tokens[id]}`}});return {status:r.status,d:await r.json()};}
  await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email) VALUES(1,'Aluno','a@teste.invalid')`);
  await app.db.query(`INSERT INTO ${app.schema}.lancamentos_academia(academia_id,tipo,descricao,valor,data) VALUES(1,'receita','Entrada',100,$1),(1,'despesa','Saída',30,$1),(1,'receita','Fora',999,'2000-01-01'),(2,'receita','Outra',500,$1)`,[hoje]);
  await app.db.query(`INSERT INTO ${app.schema}.leads_academia(academia_id,nome,email,origem,status) VALUES(1,'Contato','a@teste.invalid','Site','convertido')`);
  const r=await req();assert.equal(r.status,200,JSON.stringify(r.d));assert.equal(r.d.matriculas.novas,1);assert.equal(r.d.matriculas.ativas,1);assert.equal(r.d.caixa.length,1);assert.equal(Number(r.d.caixa[0].entradas),100);assert.equal(Number(r.d.caixa[0].saidas),30);assert.equal(r.d.leads.convertidos,1);
  assert.equal((await req(hoje,hoje,3)).status,403);assert.equal((await req(hoje,hoje,2,1)).status,403);
  assert.equal((await req(hoje,hoje,2,2)).d.matriculas.total,0);
  assert.equal((await req('2001-01-01','2001-01-02')).d.caixa.length,0);
  assert.equal((await req('2001-01-01','2003-01-01')).status,400);
 }finally{await app.fechar();}
});
