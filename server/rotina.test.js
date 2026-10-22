import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {segundaRotina,validarHorario} from './rotina.js';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
test('semanas começam na segunda e horários rejeitam datas impossíveis',()=>{assert.equal(segundaRotina('2026-09-27'),'2026-09-21');assert.equal(segundaRotina('2026-09-28'),'2026-09-28');assert.throws(()=>validarHorario({data:'2026-02-30',hora_inicio:'10:00',hora_fim:'11:00'}));assert.throws(()=>validarHorario({data:'2026-10-01',hora_inicio:'11:00',hora_fim:'10:00'}));});
test('API real: agenda, propostas, check-in privado, retornos, notificações e isolamento',async()=>{
 const app=await servidorIsolado();try{
  const users=[[1,'Aluno','aluno'],[2,'Outro','aluno'],[3,'Personal','personal'],[4,'Nutri','nutri'],[5,'Sem vínculo','personal']];for(const[id,nome,tipo]of users)await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,nome,`u${id}@example.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.conexoes_alunos(personal_id,aluno_id,status,ativo,permite_treinos) VALUES(3,1,'aceito',TRUE,TRUE)`);await app.db.query(`INSERT INTO ${app.schema}.conexoes_nutri(nutri_id,aluno_id,status,ativo,permite_dietas) VALUES(4,1,'aceito',TRUE,TRUE)`);
  const tokens=Object.fromEntries(await Promise.all(users.map(async ([id])=>[id,await app.token(id)])));const api=async(path,method='GET',body,user=1)=>{const r=await fetch(`${app.base}/api${path}`,{method,headers:{Authorization:`Bearer ${tokens[user]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
  const data=new Date(Date.now()+86400000).toISOString().slice(0,10),corpo={aluno_id:1,data,hora_inicio:'10:00',hora_fim:'11:00',tipo:'Online',orientacoes:'Encontro online',observacao:'Anotação privada'};
  assert.equal((await api('/rotina/agenda','POST',corpo)).status,403);assert.equal((await api('/rotina/agenda','POST',corpo,5)).status,403);
  const rs=await Promise.all([api('/rotina/agenda','POST',corpo,3),api('/rotina/agenda','POST',corpo,3)]);assert.deepEqual(rs.map(r=>r.status).sort(),[201,409]);let a=rs.find(r=>r.status===201).data;assert.equal(a.status,'pendente');
  const agenda=await api('/rotina/agenda');assert.equal(agenda.status,200);assert.equal(agenda.data.atendimentos[0].observacao,null);assert.equal(agenda.data.atendimentos[0].historico[0].estado.observacao,undefined);assert.equal((await api('/rotina/agenda','GET',null,2)).data.atendimentos.length,0);
  assert.equal((await api(`/rotina/agenda?data=${data}`)).data.atendimentos.length,1);assert.equal((await api('/rotina/agenda?data=2026-02-30')).status,400);
  assert.equal((await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'confirmar',versao:1},2)).status,404);assert.equal((await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'confirmar',versao:1},3)).status,409);
  const conf=await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'confirmar',versao:1});assert.equal(conf.status,200,JSON.stringify(conf));a=conf.data;assert.equal(a.observacao,undefined);
  assert.equal((await api('/rotina/agenda','POST',corpo,4)).status,409);
  a=(await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'remarcar',versao:a.versao,data,hora_inicio:'12:00',hora_fim:'13:00',motivo:'Preciso de outro horário.'})).data;assert.equal(a.status,'remarcacao');assert.equal(a.hora_inicio,'10:00:00');
  assert.equal((await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'aceitar_remarcacao',versao:a.versao})).status,409);
  a=(await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'aceitar_remarcacao',versao:a.versao},3)).data;assert.equal(a.status,'confirmado');assert.equal(a.hora_inicio,'12:00:00');
  assert.equal((await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'cancelar',versao:1,motivo:'Tela antiga'})).status,409);
  assert.equal((await api(`/rotina/agenda/${a.id}`,'PATCH',{acao:'realizado',versao:a.versao},3)).status,400);
  const semana=segundaRotina(),check={versao:0,dificuldades:'Organizar os horários',conquistas:'Treinei duas vezes',proximo_passo:'Preparar a semana',energia:3,destinatarios:[]};let ci=(await api(`/rotina/checkins/${semana}`,'PUT',check)).data;assert.ok(ci.id);assert.equal((await api('/rotina/checkins','GET',null,3)).data.checkins.length,0);
  assert.equal((await api('/rotina/checkins')).status,200);assert.equal((await api(`/rotina/checkins/${semana}`,'PUT',check,2)).status,200);
  assert.equal((await api(`/rotina/checkins/${semana}`,'PUT',{...check,versao:1,destinatarios:[5]})).status,403);
  ci=(await api(`/rotina/checkins/${semana}`,'PUT',{...check,versao:1,destinatarios:[3]})).data;assert.equal(ci.versao,2);assert.equal((await api('/rotina/checkins','GET',null,3)).data.checkins.length,1);assert.equal((await api('/rotina/checkins','GET',null,4)).data.checkins.length,0);
  const retorno={versao:2,resposta:'Vamos ajustar os horários no próximo encontro.',chave_cliente:crypto.randomUUID()};assert.equal((await api(`/rotina/checkins/${ci.id}/respostas`,'POST',retorno,4)).status,403);
  const resposta=await api(`/rotina/checkins/${ci.id}/respostas`,'POST',retorno,3);assert.equal(resposta.status,200,JSON.stringify(resposta));assert.equal((await api(`/rotina/checkins/${ci.id}/respostas`,'POST',retorno,3)).data.id,resposta.data.id);
  ci=(await api(`/rotina/checkins/${semana}`,'PUT',{...check,versao:2,dificuldades:'Relato revisado',destinatarios:[]})).data;assert.equal((await api('/rotina/checkins','GET',null,3)).data.checkins.length,0);assert.equal((await api('/rotina/retornos')).data.retornos[0].referencia.dificuldades,'Organizar os horários');assert.equal((await api('/rotina/retornos','GET',null,2)).data.retornos.length,0);
  assert.equal((await api(`/rotina/checkins/${ci.id}/respostas`,'POST',{...retorno,versao:3,chave_cliente:crypto.randomUUID()},3)).status,403);
  await app.db.query(`SELECT ${app.schema}.notificar_rotina(1,'planos','plano:teste:1','Ficha nova','/aluno/treinos')`);
  let avisos=await api('/rotina/notificacoes');assert.equal(avisos.status,200,JSON.stringify(avisos)+app.logs());assert.ok(avisos.data.notificacoes.some(n=>n.categoria==='planos'));assert.ok(avisos.data.notificacoes.some(n=>n.categoria==='respostas'));
  assert.equal((await api(`/rotina/notificacoes/${avisos.data.notificacoes[0].id}`,'PATCH',{lida:true},2)).status,404);assert.equal((await api(`/rotina/notificacoes/${avisos.data.notificacoes[0].id}`,'PATCH',{lida:true})).status,200);
  const pref={versao:0,planos:false,respostas:true,compromissos:true,checkins:false};assert.equal((await api('/rotina/preferencias','PUT',pref)).status,200);assert.equal((await api('/rotina/preferencias','PUT',pref)).status,409);
  const count=avisos.data.notificacoes.filter(n=>n.categoria==='planos').length;await app.db.query(`SELECT ${app.schema}.notificar_rotina(1,'planos','plano:teste:2','Segunda ficha','/aluno/treinos')`);assert.equal((await api('/rotina/notificacoes')).data.notificacoes.filter(n=>n.categoria==='planos').length,count);
  const painel=await api('/rotina/painel');assert.equal(painel.status,200,JSON.stringify(painel)+app.logs());assert.ok(painel.data.checkin);assert.equal(painel.data.compromissos[0].id,a.id);
  // Encerramento revoga check-ins e cancela compromissos futuros sem apagar o histórico.
  await api(`/rotina/checkins/${semana}`,'PUT',{...check,versao:3,destinatarios:[3]});const conexao=(await api('/conexoes/minhas')).data.find(c=>c.tipo==='personal');await api(`/conexoes/personal/${conexao.id}`,'DELETE');const final=(await api('/rotina/agenda')).data.atendimentos[0];assert.equal(final.status,'cancelado');assert.ok(final.historico.length>=5);assert.equal((await api('/rotina/checkins','GET',null,3)).data.checkins.length,0);
  await api('/conexoes','POST',{tipo:'personal',profissional_id:3});await api(`/profissional/solicitacoes/${conexao.id}`,'PATCH',{status:'aceito'},3);assert.equal((await api('/rotina/checkins','GET',null,3)).data.checkins.length,0);assert.equal((await api('/rotina/retornos')).data.retornos.length,1);
  await app.db.query(`UPDATE ${app.schema}.checkins_semanais SET semana=semana-98 WHERE id=$1`,[ci.id]);
  assert.equal((await api(`/rotina/checkins/${ci.id}/compartilhamento`,'DELETE',{versao:4},2)).status,409);
  assert.equal((await api(`/rotina/checkins/${ci.id}/compartilhamento`,'DELETE',{versao:4})).status,200);
 }finally{await app.fechar();}
});
