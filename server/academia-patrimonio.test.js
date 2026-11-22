import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';

test('patrimônio: saldos, manutenção, auditoria, segurança e isolamento financeiro',async()=>{
 const app=await servidorIsolado();try{
  const c=await app.db.connect();try{await c.query(`SET search_path TO ${app.schema}`);await c.query(await fs.readFile(new URL('./migrations/062_estoque_patrimonio.sql',import.meta.url),'utf8'));}finally{c.release();}
  for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)])));
  const req=async(path,method='GET',body,id=1,unidade=1)=>{const r=await fetch(`${app.base}/api/operacao-academia${path}${path.includes('?')?'&':'?'}unidade=${unidade}`,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
  const data=hojeEvolucao(),key=()=>crypto.randomUUID(),material={tipo:'material',nome:'Papel',categoria:'Higiene',unidade:'pct',quantidade:4,minimo:2,localizacao:'Armário',estado:'disponivel',ativo:true,chave_cliente:key()};
  const m=await req('/patrimonio/recursos','POST',material);assert.equal(m.status,200,JSON.stringify(m));assert.equal(Number(m.data.quantidade),4);
  const repetido=await req('/patrimonio/recursos','POST',material);assert.equal(repetido.data.id,m.data.id);
  assert.equal((await req('/patrimonio/recursos','POST',{...material,quantidade:5})).status,409);
  const editar=await req('/patrimonio/recursos','POST',{...material,id:m.data.id,versao:m.data.versao,nome:'Papel toalha',quantidade:999});assert.equal(editar.status,200);assert.equal(Number(editar.data.quantidade),4);
  const mov={recurso_id:m.data.id,tipo:'consumo',quantidade:3,data,motivo:'Uso interno',chave_cliente:key()};const saida=await req('/patrimonio/movimentos','POST',mov);assert.equal(saida.status,201,JSON.stringify(saida));assert.equal(Number(saida.data.saldo_posterior),1);
  assert.equal((await req('/patrimonio/movimentos','POST',mov)).status,201);assert.equal((await req('/patrimonio/movimentos','POST',{...mov,quantidade:2})).status,409);
  assert.equal((await req('/patrimonio/movimentos','POST',{...mov,chave_cliente:key()})).status,409);
  assert.equal((await req('/patrimonio/movimentos','POST',{...mov,tipo:'transferencia',quantidade:1,local_destino:'Sala',chave_cliente:key()})).status,201);
  assert.equal((await req('/patrimonio/movimentos','POST',{...mov,tipo:'entrada',quantidade:2,chave_cliente:key()})).status,201);
  const concorrentes=await Promise.all([req('/patrimonio/movimentos','POST',{...mov,quantidade:2,chave_cliente:key()}),req('/patrimonio/movimentos','POST',{...mov,quantidade:2,chave_cliente:key()})]);assert.deepEqual(concorrentes.map(x=>x.status).sort(),[201,409]);
  const atual=await req('/patrimonio');assert.equal(Number(atual.data.recursos[0].quantidade),1);assert.equal(atual.data.recursos[0].localizacao,'Sala');
  const eq={tipo:'equipamento',nome:'Esteira',categoria:'Cardio',unidade:'un',quantidade:1,minimo:0,localizacao:'Sala',estado:'em_manutencao',ativo:true,numero_serie:'EST-01',chave_cliente:key()};const e=await req('/patrimonio/recursos','POST',eq);assert.equal(e.status,200,JSON.stringify(e));
  assert.equal((await req('/patrimonio/recursos','POST',{...eq,nome:'Outra',chave_cliente:key()})).status,409);
  const body={recurso_id:e.data.id,tipo:'corretiva',solicitacao:data,problema:'Motor precisa de revisão',responsavel:'Técnico',prioridade:'alta',status:'pendente',chave_cliente:key()};const man=await req('/patrimonio/manutencoes','POST',body);assert.equal(man.status,200,JSON.stringify(man));
  assert.equal((await req('/patrimonio/manutencoes','POST',body)).data.id,man.data.id);assert.equal((await req('/patrimonio/manutencoes','POST',{...body,prioridade:'baixa'})).status,409);
  assert.equal((await req('/patrimonio/manutencoes','POST',{...body,id:man.data.id,versao:1,status:'concluida'})).status,400);
  assert.equal((await req('/patrimonio/manutencoes','POST',{...body,id:man.data.id,versao:1,status:'concluida',conclusao:data})).status,200);
  assert.equal((await req('/patrimonio/movimentos','POST',{recurso_id:e.data.id,tipo:'baixa_patrimonial',quantidade:1,data,motivo:'Baixa',chave_cliente:key()})).status,201);const baixado=(await req('/patrimonio')).data.recursos.find(x=>String(x.id)===String(e.data.id));assert.equal(baixado.ativo,false);assert.equal(baixado.estado,'desativado');
  assert.equal((await req('/patrimonio/movimentos')).data.movimentos.length,7);assert.equal((await req('/patrimonio','GET',null,2,2)).data.recursos.length,0);assert.equal((await req('/patrimonio','GET',null,3)).status,403);assert.equal((await req('/patrimonio/movimentos','POST',{...mov,chave_cliente:key()},2,2)).status,404);
  assert.equal((await app.db.query(`SELECT count(*)::int n FROM ${app.schema}.lancamentos_academia WHERE academia_id=1`)).rows[0].n,0);
 }finally{await app.fechar();}
});
