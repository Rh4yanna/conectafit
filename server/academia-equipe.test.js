import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
test('equipe: convite, isolamento, permissões e desativação preservada',async()=>{const app=await servidorIsolado();try{
 const c=await app.db.connect();try{await c.query(`SET search_path TO ${app.schema}`);await c.query(await fs.readFile(new URL('./migrations/065_equipe_cadastros.sql',import.meta.url),'utf8'));}finally{c.release();}
 for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno'],[4,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@equipe.invalid`,tipo]);
 const tokens=Object.fromEntries(await Promise.all([1,2,3,4].map(async id=>[id,await app.token(id)])));
 const req=async(path,method='GET',body,id=1,unit=1)=>{const r=await fetch(`${app.base}/api/operacao-academia${path}${path.includes('?')?'&':'?'}unidade=${unit}`,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const f={nome:'Funcionário',email:'3@equipe.invalid',cargo:'Recepcionista',setor:'recepcao',turno:'manha',dias:[1,2],papel_solicitado:'recepcao'};
 const criado=await req('/funcionarios','POST',f);assert.equal(criado.status,200,JSON.stringify(criado));const id=criado.data.id;
 assert.equal((await req('/funcionarios','GET',null,2,2)).data.funcionarios.length,0);
 assert.equal((await req('/equipe','POST',{email:f.email,papel:'recepcao',ativo:true,motivo:'Teste'})).status,403);
 assert.equal((await req('/funcionarios','POST',{...f,email:'4@equipe.invalid',setor:'limpeza'})).status,400);
 const convite=await req(`/funcionarios/${id}/convite`,'POST',{});assert.equal(convite.status,200,JSON.stringify(convite));
 assert.equal((await req(`/convite-equipe/${convite.data.token}/aceitar`,'POST',{},4,1)).status,403);
 assert.equal((await req(`/convite-equipe/${convite.data.token}/aceitar`,'POST',{},3,1)).status,200);
 assert.equal((await req(`/convite-equipe/${convite.data.token}/aceitar`,'POST',{},3,1)).status,404);
 assert.equal((await req('/funcionarios','GET',null,3,1)).status,403);
 const registro=(await req('/funcionarios')).data.funcionarios[0];assert.equal(registro.acesso_ativo,true);
 assert.equal((await req(`/funcionarios/${id}/situacao`,'POST',{ativo:false,versao:registro.versao})).status,200);
 assert.equal((await req('/contexto','GET',null,3,1)).status,403);assert.equal((await req('/funcionarios')).data.funcionarios[0].ativo,false);
 assert.equal((await req('/funcionarios/turnos','PUT',{manha:{inicio:'08:00',fim:'12:00'}})).status,200);
 }finally{await app.fechar();}});
