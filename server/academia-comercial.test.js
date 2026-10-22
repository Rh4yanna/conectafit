import test from 'node:test';
import assert from 'node:assert/strict';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
test('comercial: visitas, contatos, conversão sem sobrescrita e isolamento',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'personal'],[4,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,3,'professor',true),(1,4,'recepcao',true)`);
  const tokens=Object.fromEntries(await Promise.all([1,2,3,4].map(async id=>[id,await app.token(id)])));
  async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const b={nome:'Interessado teste',email:'lead@teste.invalid',telefone:'42999999999',origem:'Indicação'};
  const l=(await req('/leads','POST',b,4)).d;assert.ok(l.id);
  assert.equal((await req('/leads','POST',b)).status,409);
  assert.equal((await req('/leads','GET',null,3)).status,403);
  assert.equal((await req(`/leads/${l.id}/interacoes`,'POST',{relato:'Contato realizado'},2,2)).status,404);
  assert.equal((await req(`/leads/${l.id}/interacoes`,'POST',{relato:'Contato realizado'},4)).status,201);
  const visita={titulo:'Visita',tipo:'compromisso',responsavel:'Ana',inicio:new Date(Date.now()+86400000).toISOString(),fim:new Date(Date.now()+90000000).toISOString(),lead_id:l.id};
  const agenda=await req('/agenda','POST',visita,4);assert.equal(agenda.status,200);assert.equal(agenda.d.lead_id,l.id);
  assert.equal((await req('/agenda','POST',{...visita,responsavel:'Outro'},4)).status,409);
  let atual=(await req('/leads')).d[0];assert.equal(atual.status,'visita_agendada');assert.equal(atual.interacoes.length,2);
  const conversoes=await Promise.all([req(`/leads/${l.id}/converter`,'POST',{versao:atual.versao}),req(`/leads/${l.id}/converter`,'POST',{versao:atual.versao})]);assert.ok(conversoes.every(r=>r.status===200));assert.equal(conversoes[0].d.matricula_id,conversoes[1].d.matricula_id);
  const m=(await req('/matriculas')).d[0];assert.equal(m.situacao,'inativa');assert.equal((await req('/matriculas')).d.length,1);
  const existente=(await req('/matriculas','POST',{nome:'Nome preservado',email:'existente@teste.invalid'})).d;
  const outro=(await req('/leads','POST',{...b,nome:'Nome diferente',email:'existente@teste.invalid'})).d;
  assert.equal((await req(`/leads/${outro.id}/converter`,'POST',{versao:outro.versao})).status,409);
  assert.equal((await req(`/leads/${outro.id}/converter`,'POST',{versao:outro.versao,confirmar_matricula_id:existente.id})).status,200);
  assert.equal((await req('/matriculas')).d.find(x=>x.id===existente.id).aluno_nome,'Nome preservado');
  assert.equal((await req('/leads','GET',null,2,2)).d.length,0);
 }finally{await app.fechar();}
});
