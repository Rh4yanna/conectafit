import {Router} from 'express';
import {rota,permitir,erro,texto,tx,matricula,auditar,data} from './academia-core.js';
export function rotasAgendaAcademia(db){
 const r=Router();
 r.get('/agenda/responsaveis',rota(async(q,s)=>{s.json((await db.query('SELECT id,nome FROM usuarios WHERE id=$1 OR id IN (SELECT usuario_id FROM equipe_academia WHERE academia_id=$1 AND ativo) ORDER BY nome',[q.unidade])).rows);}));

 r.get('/agenda/periodo',rota(async(q,s)=>{
  const inicio=data(q.query.inicio),fim=data(q.query.fim);
  if(fim<inicio||Date.parse(fim)-Date.parse(inicio)>62*86400000)throw erro('Selecione um período de até 63 dias.');
  const valores=[q.unidade,inicio,fim];
  const [compromissos,turmas]=await Promise.all([
   db.query(`SELECT a.*,m.aluno_nome FROM agenda_academia a LEFT JOIN matriculas_academia m ON m.id=a.matricula_id WHERE a.academia_id=$1 AND a.inicio<($3::date+interval '1 day') AT TIME ZONE 'America/Sao_Paulo' AND a.fim>$2::date AT TIME ZONE 'America/Sao_Paulo' ORDER BY a.inicio,a.id`,valores),
   db.query(`SELECT id,nome AS titulo,professor AS responsavel,inicio,fim,cancelada AS cancelado FROM turmas_academia WHERE academia_id=$1 AND inicio<($3::date+interval '1 day') AT TIME ZONE 'America/Sao_Paulo' AND fim>$2::date AT TIME ZONE 'America/Sao_Paulo' ORDER BY inicio,id`,valores)
  ]);
  s.json([...compromissos.rows.map(a=>({...a,chave:'a'+a.id})),...turmas.rows.map(t=>({...t,chave:'t'+t.id,turma:true}))].sort((a,b)=>new Date(a.inicio)-new Date(b.inicio)));
 }));
 r.get('/agenda',rota(async(q,s)=>{
  const mes=q.query.mes;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes||''))throw erro('Mês inválido.');
  s.json((await db.query(`SELECT a.*,m.aluno_nome FROM agenda_academia a LEFT JOIN matriculas_academia m ON m.id=a.matricula_id WHERE a.academia_id=$1 AND a.inicio<($2::date+interval '1 month') AT TIME ZONE 'America/Sao_Paulo' AND a.fim>=$2::date AT TIME ZONE 'America/Sao_Paulo' ORDER BY a.inicio,a.id`,[q.unidade,mes+'-01'])).rows);
 }));
 r.post('/agenda',rota(async(q,s)=>{
  permitir(q,'gestor','recepcao');const b=q.body,titulo=texto(b.titulo,120,true),responsavelInformado=texto(b.responsavel,150,!b.responsavel_id),observacao=texto(b.observacao,2000),inicio=new Date(b.inicio),fim=new Date(b.fim);
  if(!['compromisso','avaliacao'].includes(b.tipo)||!Number.isFinite(+inicio)||!Number.isFinite(+fim)||fim<=inicio||fim-inicio>86400000)throw erro('Confira o tipo e os horários do compromisso.');
  s.json(await tx(db,async c=>{
   await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.unidade]);
   let responsavel=responsavelInformado;
   if(b.responsavel_id){const u=(await c.query('SELECT id,nome FROM usuarios WHERE id=$2 AND (id=$1 OR EXISTS(SELECT 1 FROM equipe_academia WHERE academia_id=$1 AND usuario_id=$2 AND ativo))',[q.unidade,b.responsavel_id])).rows[0];if(!u)throw erro('Responsável não pertence à equipe ativa.',400);responsavel=u.nome;}
   let antes;if(b.id){antes=(await c.query('SELECT * FROM agenda_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[b.id,q.unidade])).rows[0];if(!antes)throw erro('Compromisso não encontrado.',404);if(antes.cancelado||antes.versao!==b.versao)throw erro('Compromisso alterado. Atualize a agenda.',409);}
   let interessado;
   const leadId=antes?.lead_id||b.lead_id;
   if(leadId){interessado=(await c.query('SELECT * FROM leads_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[leadId,q.unidade])).rows[0];if(!interessado)throw erro('Interessado não encontrado.',404);if(!antes&&['convertido','perdido'].includes(interessado.status))throw erro('Reabra o atendimento antes de agendar uma visita.');}
   if(b.matricula_id)await matricula(c,q,b.matricula_id);
   const conflito=await c.query(`SELECT id FROM agenda_academia WHERE academia_id=$1 AND NOT cancelado AND id<>COALESCE($2,0) AND inicio<$4 AND fim>$3 AND (lower(trim(responsavel))=lower(trim($5)) OR responsavel_id=$7 OR matricula_id=$6) UNION ALL SELECT t.id FROM turmas_academia t WHERE t.academia_id=$1 AND NOT t.cancelada AND t.inicio<$4 AND t.fim>$3 AND (lower(trim(t.professor))=lower(trim($5)) OR EXISTS(SELECT 1 FROM reservas_academia r WHERE r.turma_id=t.id AND NOT r.cancelada AND r.matricula_id=$6))`,[q.unidade,b.id||null,inicio,fim,responsavel,b.matricula_id||null,b.responsavel_id||null]);
   if(interessado&&(await c.query('SELECT id FROM agenda_academia WHERE academia_id=$1 AND lead_id=$2 AND NOT cancelado AND id<>COALESCE($3,0) AND inicio<$5 AND fim>$4',[q.unidade,interessado.id,b.id||null,inicio,fim])).rows.length)throw erro('Interessado já possui visita neste horário.',409);
   if(conflito.rows.length)throw erro('O responsável ou aluno já tem um agendamento neste horário.',409);
   const valores=[q.unidade,b.matricula_id||null,titulo,b.tipo,responsavel,inicio,fim,observacao];
   const novo=(await c.query(antes?'UPDATE agenda_academia SET matricula_id=$2,titulo=$3,tipo=$4,responsavel=$5,inicio=$6,fim=$7,observacao=$8,versao=versao+1 WHERE academia_id=$1 AND id=$9 RETURNING *':'INSERT INTO agenda_academia(academia_id,matricula_id,titulo,tipo,responsavel,inicio,fim,observacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',antes?[...valores,b.id]:valores)).rows[0];
   await c.query('UPDATE agenda_academia SET responsavel_id=$2 WHERE id=$1',[novo.id,b.responsavel_id||null]);novo.responsavel_id=b.responsavel_id||null;
   if(interessado){await c.query('UPDATE agenda_academia SET lead_id=$2 WHERE id=$1',[novo.id,interessado.id]);novo.lead_id=interessado.id;if(!antes){await c.query("UPDATE leads_academia SET status='visita_agendada',versao=versao+1 WHERE id=$1",[interessado.id]);}await c.query('INSERT INTO interacoes_leads_academia(lead_id,autor_id,relato) VALUES($1,$2,$3)',[interessado.id,q.usuario.id,`${antes?'Reagendamento':'Agendamento'}: ${titulo}, ${inicio.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}.`]);}
   await auditar(c,q,'agenda',novo.id,antes?'editar':'criar','Agendamento da academia',antes,novo);return novo;
  }));
 }));
 r.delete('/agenda/:id',rota(async(q,s)=>{permitir(q,'gestor','recepcao');const motivo=texto(q.body.motivo,1000,true);await tx(db,async c=>{const antes=(await c.query('SELECT * FROM agenda_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[q.params.id,q.unidade])).rows[0];if(!antes)throw erro('Compromisso não encontrado.',404);if(antes.versao!==q.body.versao||antes.cancelado)throw erro('Compromisso alterado. Atualize a agenda.',409);const novo=(await c.query('UPDATE agenda_academia SET cancelado=true,versao=versao+1 WHERE id=$1 RETURNING *',[antes.id])).rows[0];if(antes.lead_id){await c.query("UPDATE leads_academia SET status='em_contato',versao=versao+1 WHERE id=$1 AND academia_id=$2 AND status='visita_agendada' AND NOT EXISTS(SELECT 1 FROM agenda_academia WHERE lead_id=$1 AND NOT cancelado AND fim>NOW())",[antes.lead_id,q.unidade]);await c.query('INSERT INTO interacoes_leads_academia(lead_id,autor_id,relato) VALUES($1,$2,$3)',[antes.lead_id,q.usuario.id,`Visita cancelada: ${motivo}`]);} await auditar(c,q,'agenda',antes.id,'cancelar',motivo,antes,novo);});s.json({ok:true});}));
 return r;
}
