import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('controle de acesso: regras, ocupação, histórico, equipamentos e isolamento',async()=>{const app=await servidorIsolado();try{
 const c=await app.db.connect();try{await c.query(`SET search_path TO ${app.schema}`);await c.query(await fs.readFile(new URL('./migrations/064_controle_acesso_equipamentos.sql',import.meta.url),'utf8'));}finally{c.release();}
 for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@teste.invalid`,tipo]);
 await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'recepcao',true)`);
 const m=(await app.db.query(`INSERT INTO ${app.schema}.matriculas_academia(academia_id,aluno_nome,aluno_email,situacao,ativo) VALUES(1,'Ana','ana@teste.invalid','ativa',true) RETURNING id`)).rows[0],tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)]))),hoje=hojeEvolucao();
 const req=async(path,method='GET',body,id=1,unidade=1)=>{const r=await fetch(`${app.base}/api/operacao-academia${path}${path.includes('?')?'&':'?'}unidade=${unidade}`,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 assert.equal((await req('/fluxo/equipamentos','POST',{nome:'Catraca',identificacao:'A',ativo:true})).status,200);
 assert.equal((await req('/fluxo/configuracoes','GET',null,2,2)).data.equipamentos.length,0);assert.equal((await req('/fluxo/configuracoes','GET',null,3)).status,403);
 assert.equal((await req('/fluxo/politica','PUT',{inicio:'08:00',fim:'07:00',recepcao_manual:true})).status,400);
 assert.equal((await req('/fluxo/politica','PUT',{inicio:'',fim:'',recepcao_manual:true})).status,200);
 const entrada=await req('/fluxo/entrada','POST',{matricula_id:m.id});assert.equal(entrada.status,201,JSON.stringify(entrada));
 assert.equal((await req('/fluxo/entrada','POST',{matricula_id:m.id})).status,409);
 let lista=await req(`/fluxo?inicio=${hoje}&fim=${hoje}&busca=Ana`);assert.equal(lista.status,200,JSON.stringify(lista));assert.equal(lista.data.presentes.length,1);assert.equal(lista.data.resumo.negados,1);assert.equal(lista.data.resumo.entradas_hoje,1);
 assert.equal((await req(`/fluxo/${entrada.data.id}/saida`,'POST',{},2,2)).status,404);assert.equal((await req(`/fluxo/${entrada.data.id}/saida`,'POST',{})).status,200);
 lista=await req(`/fluxo?inicio=${hoje}&fim=${hoje}&situacao=fechado`);assert.equal(lista.data.presentes.length,0);assert.equal(lista.data.resumo.total_filtrado,1);
 assert.equal((await req('/fluxo/politica','PUT',{inicio:'',fim:'',recepcao_manual:false})).status,200);
 assert.equal((await req('/fluxo/entrada','POST',{matricula_id:m.id},3)).status,403);
 assert.equal((await app.db.query(`SELECT count(*)::int n FROM ${app.schema}.presencas_academia`)).rows[0].n,1);
 }finally{await app.fechar();}});
