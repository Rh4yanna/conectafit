import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {publicarCatalogo,licencaPermitida} from '../scripts/catalogo-seguro.mjs';
test('sincronização preserva catálogo após resposta incompleta e guarda instruções retiradas',async()=>{
 const pasta=await fs.mkdtemp(path.join(os.tmpdir(),'conectafit-catalogo-')),destino=pathToFileURL(path.join(pasta,'exercicios.json'));
 const licenca={nome:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'};
 const lista=Array.from({length:100},(_,i)=>({id:`wger:${i}`,nome:`Exercício ${i}`,instrucoes:'Instrução preservada',licenca,videos:[],imagens:[]}));
 try{await fs.writeFile(destino,JSON.stringify({exercicios:lista}));const antes=await fs.readFile(destino,'utf8');await assert.rejects(publicarCatalogo(destino,{exercicios:lista.slice(0,60)}));assert.equal(await fs.readFile(destino,'utf8'),antes);assert.equal(licencaPermitida({url:'https://outro.invalid/licenses/by/4.0/'}),false);assert.equal(licencaPermitida({url:'https://creativecommons.org/licenses/by-nc/4.0/'}),false);assert.equal(await publicarCatalogo(destino,{exercicios:lista.slice(0,90)}),10);const depois=JSON.parse(await fs.readFile(destino,'utf8'));assert.equal(depois.exercicios.length,100);assert.equal(depois.exercicios[99].indisponivel,true);assert.equal(depois.exercicios[99].instrucoes,'Instrução preservada');assert.deepEqual((await fs.readdir(pasta)),['exercicios.json']);}finally{assert.equal(path.dirname(path.resolve(pasta)),path.resolve(os.tmpdir()));assert.ok(path.basename(pasta).startsWith('conectafit-catalogo-'));await fs.rm(pasta,{recursive:true,force:true});}
});
test('quatro perfis: orientação privada, permissões, notificações e atividade sem conteúdo sensível',async()=>{
 const app=await servidorIsolado();try{
 const perfis=['aluno','personal','nutri','academia'];for(const [i,tipo]of perfis.entries())await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[i+1,`Pessoa ${tipo}`,`${tipo}@example.invalid`,tipo]);
 const tokens=Object.fromEntries(await Promise.all(perfis.map(async (p,i)=>[p,await app.token(i+1)])));
 const api=async(p,url,method='GET',b)=>{const r=await fetch(app.base+'/api'+url,{method,headers:{Authorization:`Bearer ${tokens[p]}`,'Content-Type':'application/json'},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,data:await r.json()};};
 for(const p of perfis){const d=await api(p,'/qualidade/inicio');assert.equal(d.data.perfil,p);assert.equal(d.data.versao,0);assert.equal((await api(p,'/qualidade/inicio','PUT',{versao:0,concluidos:['perfil'],recolhido:true})).status,200);assert.equal((await api(p,'/qualidade/inicio','PUT',{versao:0,concluidos:[],recolhido:false})).status,409);assert.equal((await api(p,'/qualidade/inicio')).data.concluidos[0],'perfil');const pref=await api(p,'/rotina/preferencias');assert.equal(pref.status,200);assert.equal((await api(p,'/rotina/preferencias','PUT',{...pref.data,solicitacoes:false})).status,200);}
 assert.equal((await api('academia','/rotina/agenda')).status,403);assert.equal((await api('aluno','/operacao-academia/contexto?unidade=4')).status,403);assert.equal((await api('academia','/nutricao/modelos')).status,403);assert.equal((await api('nutri','/personal/demonstracoes')).status,403);assert.equal((await api('personal','/alimentacao/planos')).status,403);
 await app.db.query(`INSERT INTO ${app.schema}.solicitacoes_academia(aluno_id,academia_id,chave_cliente,tipo,data,horario,oferta) VALUES(1,4,'00000000-0000-4000-8000-000000000001','visita',CURRENT_DATE+1,'12:00','{}')`);
 assert.equal((await api('academia','/rotina/notificacoes')).data.notificacoes.length,0);
 let pref=(await api('academia','/rotina/preferencias')).data;await api('academia','/rotina/preferencias','PUT',{...pref,solicitacoes:true});const aviso=(await api('academia','/rotina/notificacoes')).data.notificacoes[0];assert.ok(aviso.destino.includes('aba=visitas'));assert.equal((await api('aluno',`/rotina/notificacoes/${aviso.id}`,'PATCH',{lida:true})).status,404);assert.equal((await api('academia',`/rotina/notificacoes/${aviso.id}`,'PATCH',{lida:true})).status,200);
 const atividade=(await api('aluno','/qualidade/atividade')).data.atividades;assert.ok(atividade.length>=2);assert.ok(atividade.every(a=>!('corpo' in a)&&!('senha' in a)));assert.ok(atividade.some(a=>a.rota==='/api/qualidade/inicio'));
 assert.equal((await api('nutri','/nutri/perfil/me','PUT',{nome:'Nome teste',preco_mensal:-1})).status,400);assert.equal((await api('nutri','/nutri/perfil/me','PUT',{nome:'Nome teste',bio:'Texto preservado'})).status,200);
 const antesPerfil=(await api('nutri','/qualidade/perfil/historico')).data.revisoes;assert.ok(antesPerfil.some(r=>r.dados.bio==='Texto preservado'));await api('nutri','/nutri/perfil/me','PUT',{nome:'Nome atualizado',bio:'Segunda versao'});const revisoes=(await api('nutri','/qualidade/perfil/historico')).data.revisoes.filter(r=>r.origem==='nutri');assert.equal(revisoes[0].versao,2);assert.equal(revisoes[1].dados.bio,'Texto preservado');assert.ok(revisoes.every(r=>!r.dados.senha_hash&&!r.dados.foto_perfil));assert.ok((await api('aluno','/qualidade/perfil/historico')).data.revisoes.every(r=>r.origem==='conta'));
 }finally{await app.fechar();}
});
