import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';

test('compromissos de personal e nutri: editar, apagar e isolar contas',async()=>{const app=await servidorIsolado();try{
 for(const [id,tipo] of [[1,'personal'],[2,'nutri'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`${id}@agenda.invalid`,tipo]);
 const tokens=Object.fromEntries(await Promise.all([1,2,3].map(async id=>[id,await app.token(id)])));
 const api=async(path,method='GET',body,id=1)=>{const r=await fetch(`${app.base}/api/profissional/painel/calendario${path}`,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 for(const user of [1,2]){const original={data:'2026-11-20',horario:'09:00',observacao:'Reunião'},criado=await api('','POST',original,user);assert.equal(criado.status,201,JSON.stringify(criado));const id=criado.data.id;
  assert.equal((await api(`/${id}`,'PUT',{...original,horario:'10:15',observacao:'Atualizado'},user===1?2:1)).status,404);
  assert.equal((await api(`/${id}`,'PUT',{...original,horario:'99:00'},user)).status,400);
  assert.equal((await api(`/${id}`,'PUT',{...original,horario:'10:15',observacao:'Atualizado'},user)).status,200);
  assert.ok((await api('?mes=2026-11','GET',null,user)).data.some(x=>x.observacao==='Atualizado'));
  assert.equal((await api(`/${id}`,'DELETE',null,user===1?2:1)).status,404);
  assert.equal((await api(`/${id}`,'DELETE',null,user)).status,200);
  assert.equal((await api(`/${id}`,'DELETE',null,user)).status,404);
 }assert.equal((await api('?mes=2026-11','GET',null,3)).status,403);
 }finally{await app.fechar();}});
