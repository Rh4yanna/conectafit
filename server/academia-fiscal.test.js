import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';

test('fiscal: rascunhos, vínculo, idempotência, permissões e isolamento',async()=>{const app=await servidorIsolado();try{
 const c=await app.db.connect();try{await c.query(`SET search_path TO ${app.schema}`);await c.query(await fs.readFile(new URL('./migrations/063_fiscal_academia.sql',import.meta.url),'utf8'));}finally{c.release();}
 for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@teste.invalid`,tipo]);
 await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
 const matricula=(await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email) VALUES(1,'Ana','ana@teste.invalid') RETURNING id`)).rows[0];
 const mensalidade=(await app.db.query(`INSERT INTO ${app.schema}.mensalidades_academia(matricula_id,competencia,vencimento,valor) VALUES($1,'2026-11-01','2026-11-10',120) RETURNING id`,[matricula.id])).rows[0];
 const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)])));
 const req=async(path,method='GET',body,id=1,unidade=1)=>{const r=await fetch(`${app.base}/api/operacao-academia${path}?unidade=${unidade}`,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 assert.equal((await req('/fiscal')).data.documentos.length,0);assert.equal((await req('/fiscal','GET',null,3)).status,403);
 assert.equal((await req('/fiscal/configuracao','PUT',{razao_social:'Academia',cnpj:'123'})).status,400);
 assert.equal((await req('/fiscal/configuracao','PUT',{razao_social:'Academia',cnpj:'12345678000199',ambiente:'homologacao'})).status,200);
 assert.equal((await req('/fiscal')).data.config.razao_social,'Academia');assert.deepEqual((await req('/fiscal','GET',null,2,2)).data.config,{});
 const body={tomador:'Ana',servico:'Plano mensal',competencia:'2026-11',valor:120,desconto:0,mensalidade_id:mensalidade.id,matricula_id:matricula.id,chave_cliente:crypto.randomUUID()};
 const novo=await req('/fiscal/rascunhos','POST',body);assert.equal(novo.status,201,JSON.stringify(novo));assert.equal(novo.data.status,'rascunho');
 assert.equal((await req('/fiscal/rascunhos','POST',body)).data.id,novo.data.id);assert.equal((await req('/fiscal/rascunhos','POST',{...body,valor:121})).status,409);
 assert.equal((await req('/fiscal/rascunhos','POST',{...body,chave_cliente:crypto.randomUUID()})).status,409);
 assert.equal((await req(`/fiscal/documentos/${novo.data.id}`)).data.eventos.length,1);assert.equal((await req(`/fiscal/documentos/${novo.data.id}`,'GET',null,2,2)).status,404);
 assert.equal((await req(`/fiscal/rascunhos/${novo.data.id}`,'PUT',{...body,servico:'Plano atualizado'})).data.dados.servico,'Plano atualizado');
 assert.equal((await req(`/fiscal/documentos/${novo.data.id}`)).data.eventos.length,2);
 assert.equal((await req(`/fiscal/rascunhos/${novo.data.id}`,'PUT',body,2,2)).status,404);
 await app.db.query(`UPDATE ${app.schema}.documentos_fiscais_academia SET status='autorizada' WHERE id=$1`,[novo.data.id]);
 assert.equal((await req(`/fiscal/rascunhos/${novo.data.id}`,'PUT',body)).status,409);
 assert.equal((await req('/fiscal/rascunhos','POST',{...body,chave_cliente:crypto.randomUUID()},2,2)).status,404);
 assert.equal((await req('/fiscal/rascunhos','POST',{...body,mensalidade_id:null,matricula_id:null,valor:-1,chave_cliente:crypto.randomUUID()})).status,400);
 assert.equal((await app.db.query(`SELECT count(*)::int n FROM ${app.schema}.lancamentos_academia`)).rows[0].n,0);
 }finally{await app.fechar();}});
