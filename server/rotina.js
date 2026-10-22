import {Router} from 'express';
import {dataValida,hojeEvolucao} from './evolucao.js';
const falha=(m,status=400)=>Object.assign(new Error(m),{status});
const id=v=>/^\d+$/.test(String(v))&&Number.isSafeInteger(Number(v))&&Number(v)>0;
const texto=(v,max=2000)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw falha(`Use até ${max} caracteres.`);return v.trim();};
const hora=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function segundaRotina(data=hojeEvolucao()){const d=new Date(data+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function validarHorario(b){if(!dataValida(b.data,true)||!hora(b.hora_inicio)||!hora(b.hora_fim)||b.hora_fim<=b.hora_inicio||Date.parse(b.data)-Date.parse(hojeEvolucao())>366*86400000)throw falha('Informe data e horários válidos, até um ano à frente.');return {data:b.data,hora_inicio:b.hora_inicio,hora_fim:b.hora_fim};}
export async function conexoesRotina(db,aluno){return (await db.query(`SELECT u.id,u.nome,'personal' AS tipo,c.ciclo FROM conexoes_alunos c JOIN usuarios u ON u.id=c.personal_id WHERE c.aluno_id=$1 AND c.status='aceito' AND c.ativo UNION ALL SELECT u.id,u.nome,'nutri',c.ciclo FROM conexoes_nutri c JOIN usuarios u ON u.id=c.nutri_id WHERE c.aluno_id=$1 AND c.status='aceito' AND c.ativo ORDER BY nome`,[aluno])).rows;}
const vinculo=async(db,aluno,prof)=>{const c=(await conexoesRotina(db,aluno)).find(c=>String(c.id)===String(prof));if(!c)throw falha('O acompanhamento precisa estar ativo.',403);return c;};
async function futuro(db,h){if(!(await db.query("SELECT ($1::date+$2::time)>NOW() AT TIME ZONE 'America/Sao_Paulo' AS ok",[h.data,h.hora_inicio])).rows[0].ok)throw falha('Escolha um horário futuro, no horário de Brasília.');}
async function conflito(db,h,prof,aluno,excluir=0){
 await db.query('SELECT id FROM usuarios WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE',[[prof,...(aluno?[aluno]:[])]]);
 const r=await db.query(`SELECT id FROM agenda_profissional WHERE id<>$1 AND status IN ('pendente','confirmado','remarcacao') AND data=$2 AND hora_inicio<$4::time AND hora_fim>$3::time AND (profissional_id=$5 OR ($6::bigint IS NOT NULL AND aluno_id=$6)) LIMIT 1`,[excluir,h.data,h.hora_inicio,h.hora_fim,prof,aluno||null]);if(r.rows.length)throw falha('Este horário conflita com outro atendimento do profissional ou do aluno.',409);
}
const transacao=async(db,f)=>{const c=await db.connect();try{await c.query('BEGIN');const r=await f(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
export async function criarAtendimento(db,u,b){
 if(!['personal','nutri'].includes(u.tipo_usuario))throw falha('Somente profissionais podem criar atendimentos.',403);
 const h=validarHorario(b),aluno=b.aluno_id==null||b.aluno_id===''?null:b.aluno_id;if(aluno!==null&&!id(aluno))throw falha('Aluno inválido.');if(!['Presencial','Online'].includes(b.tipo))throw falha('Modalidade inválida.');
 return transacao(db,async c=>{await futuro(c,h);let nome=texto(b.aluno_nome,120);if(aluno){await vinculo(c,aluno,u.id);nome=(await c.query('SELECT nome FROM usuarios WHERE id=$1',[aluno])).rows[0].nome;}if(!nome)throw falha('Informe o aluno conectado ou o nome do cliente externo.');await conflito(c,h,u.id,aluno);
  return (await c.query(`INSERT INTO agenda_profissional(profissional_id,aluno_id,aluno_nome,data,hora_inicio,hora_fim,tipo,observacao,orientacoes,status,alterado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$1) RETURNING *,data::text`,[u.id,aluno,nome,h.data,h.hora_inicio,h.hora_fim,b.tipo,texto(b.observacao),texto(b.orientacoes),aluno?'pendente':'confirmado'])).rows[0];
 });
}
export async function alterarAtendimento(db,u,agendaId,b){
 if(!id(agendaId)||!Number.isInteger(b.versao)||b.versao<1)throw falha('Recarregue o atendimento antes de alterar.',409);
 return transacao(db,async c=>{const a=(await c.query('SELECT *,data::text FROM agenda_profissional WHERE id=$1 FOR UPDATE',[agendaId])).rows[0];const profissional=a&&String(a.profissional_id)===String(u.id)&&['personal','nutri'].includes(u.tipo_usuario),aluno=a&&String(a.aluno_id)===String(u.id)&&u.tipo_usuario==='aluno';if(!a||(!profissional&&!aluno))throw falha('Atendimento não encontrado.',404);if(a.versao!==b.versao)throw falha('O atendimento foi atualizado. Recarregue.',409);
  if(['cancelado','realizado','ausente'].includes(a.status))throw falha('Este atendimento já foi encerrado.',409);
  let status=a.status,proposta=a.proposta,h={data:a.data,hora_inicio:a.hora_inicio,hora_fim:a.hora_fim};const motivo=texto(b.motivo);
  if(b.acao==='cancelar'){if(!motivo)throw falha('Informe o motivo do cancelamento.');status='cancelado';proposta=null;}
  else {
   if(a.aluno_id)await vinculo(c,a.aluno_id,a.profissional_id);
   if(b.acao==='confirmar'){if(!aluno||a.status!=='pendente')throw falha('Somente o aluno confirma um atendimento pendente.',409);await futuro(c,h);status='confirmado';}
   else if(b.acao==='remarcar'){if(a.status==='remarcacao')throw falha('Resolva a proposta atual antes de sugerir outro horário.',409);h=validarHorario(b);await futuro(c,h);await conflito(c,h,a.profissional_id,a.aluno_id,a.id);if(!motivo)throw falha('Explique o motivo da remarcação.');if(a.aluno_id){proposta={...h,autor_id:u.id,status_anterior:a.status,motivo};h={data:a.data,hora_inicio:a.hora_inicio,hora_fim:a.hora_fim};status='remarcacao';}else status='confirmado';}
   else if(['aceitar_remarcacao','recusar_remarcacao'].includes(b.acao)){if(a.status!=='remarcacao'||!proposta||String(proposta.autor_id)===String(u.id))throw falha('A outra pessoa precisa responder à proposta.',409);if(b.acao==='aceitar_remarcacao'){h=proposta;await futuro(c,h);await conflito(c,h,a.profissional_id,a.aluno_id,a.id);status='confirmado';}else{if(!motivo)throw falha('Explique por que não pode aceitar este horário.');status=proposta.status_anterior;}proposta=null;}
   else if(['realizado','ausente'].includes(b.acao)){if(!profissional||a.status!=='confirmado')throw falha('Somente o profissional registra o resultado de um atendimento confirmado.',409);const passou=(await c.query("SELECT ($1::date+$2::time)<=NOW() AT TIME ZONE 'America/Sao_Paulo' AS ok",[a.data,a.hora_fim])).rows[0].ok;if(!passou)throw falha('Registre o resultado depois do término previsto.');status=b.acao;}
   else throw falha('Ação inválida.');
  }
  return (await c.query(`UPDATE agenda_profissional SET status=$1,proposta=$2,data=$3,hora_inicio=$4,hora_fim=$5,motivo=$6,alterado_por=$7,versao=versao+1,atualizado_em=NOW() WHERE id=$8 RETURNING *,data::text`,[status,proposta?JSON.stringify(proposta):null,h.data,h.hora_inicio,h.hora_fim,motivo,u.id,a.id])).rows[0];
 });
}
async function agenda(db,u,query={}){
 const offset=pagina(query.offset);if(query.data&&!dataValida(query.data,true))throw falha('Data de consulta inválida.');const campo=u.tipo_usuario==='aluno'?'a.aluno_id':'a.profissional_id';const r=await db.query(`SELECT a.id,a.aluno_id,a.profissional_id,a.aluno_nome,u.nome AS profissional_nome,a.data::text,a.hora_inicio,a.hora_fim,a.tipo,a.orientacoes,a.status,a.proposta,a.motivo,a.versao,a.atualizado_em,${u.tipo_usuario==='aluno'?"NULL::text":"a.observacao"} AS observacao,
 COALESCE((SELECT json_agg(h ORDER BY h.id) FROM historico_agenda h WHERE h.agenda_id=a.id),'[]') AS historico FROM agenda_profissional a JOIN usuarios u ON u.id=a.profissional_id WHERE ${campo}=$1 AND ($3::date IS NULL OR a.data=$3::date OR (a.proposta->>'data')::date=$3::date) ORDER BY CASE WHEN a.status IN ('pendente','confirmado','remarcacao') AND a.data>= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date THEN 0 ELSE 1 END,CASE WHEN a.status IN ('pendente','confirmado','remarcacao') AND a.data>=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date THEN a.data END ASC,a.data DESC,a.hora_inicio ASC,a.id DESC LIMIT 21 OFFSET $2`,[u.id,offset,query.data||null]);return {atendimentos:r.rows.slice(0,20),tem_mais:r.rows.length>20};
}
const pagina=v=>{const n=Number(v||0);if(!Number.isSafeInteger(n)||n<0)throw falha('Página inválida.');return n;};
async function retornos(db,aluno,offset=0){const r=await db.query(`SELECT * FROM (
 SELECT 'checkin' AS tipo,r.id,r.autor_nome,r.resposta AS texto,'Check-in da semana '||(r.referencia->>'semana') AS contexto,r.referencia,r.criado_em AS data FROM respostas_checkin r JOIN checkins_semanais c ON c.id=r.checkin_id WHERE c.aluno_id=$1
 UNION ALL SELECT 'evolucao',id,autor_nome,comentario,referencia,jsonb_build_object('tipo',alvo_tipo),criado_em FROM comentarios_evolucao WHERE aluno_id=$1
 UNION ALL SELECT 'alimentacao',d.id,COALESCE(u.nome,'Nutricionista'),d.resposta,'Dúvida sobre alimentação',d.contexto||jsonb_build_object('pergunta',d.pergunta),d.respondida_em FROM duvidas_alimentares d LEFT JOIN usuarios u ON u.id=d.nutri_id WHERE d.aluno_id=$1 AND d.resposta IS NOT NULL) t ORDER BY data DESC,tipo,id DESC LIMIT 21 OFFSET $2`,[aluno,offset]);return {retornos:r.rows.slice(0,20),tem_mais:r.rows.length>20};}
async function lembrar(db,u){
 if(u.tipo_usuario==='academia'){
  await db.query(`SELECT notificar_rotina(academia_id,'solicitacoes','academia:visita:'||id,'Nova solicitação de visita ou aula experimental','/academia/dashboard?aba=visitas') FROM solicitacoes_academia WHERE academia_id=$1 AND status='pendente'`,[u.id]);
  await db.query(`SELECT notificar_rotina(academia_id,'compromissos','academia:renovacao:'||id||':'||termino,'Uma matrícula vence nos próximos 30 dias','/academia/dashboard?aba=alunos') FROM matriculas_academia WHERE academia_id=$1 AND situacao='ativa' AND termino BETWEEN (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND (NOW() AT TIME ZONE 'America/Sao_Paulo')::date+30`,[u.id]);
  await db.query(`SELECT notificar_rotina(academia_id,'compromissos','academia:aula:'||id,'Uma turma começa nas próximas 24 horas','/academia/dashboard?aba=turmas') FROM turmas_academia WHERE academia_id=$1 AND NOT cancelada AND inicio BETWEEN NOW() AND NOW()+interval '24 hours'`,[u.id]);return;
 }
 if(['personal','nutri'].includes(u.tipo_usuario)){await db.query(`SELECT notificar_rotina(profissional_id,'compromissos','lembrete:profissional:'||id||':'||versao,'Você tem um atendimento nas próximas 24 horas',CASE WHEN $2='nutri' THEN '/nutri/dashboard?aba=agenda' ELSE '/personal/dashboard?aba=agenda' END) FROM agenda_profissional WHERE profissional_id=$1 AND status IN ('pendente','confirmado') AND data+hora_inicio BETWEEN (NOW() AT TIME ZONE 'America/Sao_Paulo') AND (NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '24 hours'`,[u.id,u.tipo_usuario]);return;}
 if(u.tipo_usuario!=='aluno')return;
 await db.query(`SELECT notificar_rotina(aluno_id,'compromissos','lembrete:agenda:'||id||':'||versao,'Você tem um atendimento nas próximas 24 horas','/aluno/rotina#agenda') FROM agenda_profissional WHERE aluno_id=$1 AND status IN ('pendente','confirmado') AND data+hora_inicio BETWEEN (NOW() AT TIME ZONE 'America/Sao_Paulo') AND (NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '24 hours'`,[u.id]);
 await db.query(`SELECT notificar_rotina(aluno_id,'compromissos','lembrete:visita:'||id||':'||versao,'Você tem uma visita ou aula experimental nas próximas 24 horas','/aluno/conexoes') FROM solicitacoes_academia WHERE aluno_id=$1 AND status='confirmada' AND data+horario BETWEEN (NOW() AT TIME ZONE 'America/Sao_Paulo') AND (NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '24 hours'`,[u.id]);
 if(!(await db.query('SELECT id FROM checkins_semanais WHERE aluno_id=$1 AND semana=$2',[u.id,segundaRotina()])).rows.length)await db.query("SELECT notificar_rotina($1,'checkins',$2,'Seu check-in semanal está disponível','/aluno/rotina#checkin')",[u.id,`semana:${segundaRotina()}`]);
}
const preferencias={planos:true,respostas:true,compromissos:true,checkins:true,solicitacoes:true,versao:0};
async function notificacoes(db,u,offset=0){await lembrar(db,u);const r=await db.query('SELECT * FROM notificacoes WHERE usuario_id=$1 AND excluida_em IS NULL ORDER BY criada_em DESC,id DESC LIMIT 21 OFFSET $2',[u.id,offset]);const total=(await db.query('SELECT COUNT(*)::int AS total FROM notificacoes WHERE usuario_id=$1 AND excluida_em IS NULL AND lida_em IS NULL',[u.id])).rows[0].total;return {notificacoes:r.rows.slice(0,20),tem_mais:r.rows.length>20,nao_lidas:total};}
export function rotasRotina(db){
 const r=Router();r.use((_q,s,n)=>{s.set('Cache-Control','no-store');n();});const rota=f=>async(q,s)=>{try{await f(q,s);}catch(e){if(!e.status)console.error('Rotina:',e.message);s.status(e.status||500).json({message:e.status?e.message:'Não foi possível atualizar a rotina.'});}};
 const aluno=(q,s,n)=>q.usuario.tipo_usuario==='aluno'?n():s.status(403).json({message:'Disponível para alunos.'});
 r.get('/agenda',rota(async(q,s)=>s.json(await agenda(db,q.usuario,q.query))));
 r.post('/agenda',rota(async(q,s)=>s.status(201).json(await criarAtendimento(db,q.usuario,q.body))));
 r.patch('/agenda/:id',rota(async(q,s)=>{const a=await alterarAtendimento(db,q.usuario,q.params.id,q.body);if(q.usuario.tipo_usuario==='aluno')delete a.observacao;s.json(a);}));
 r.get('/conexoes',aluno,rota(async(q,s)=>s.json(await conexoesRotina(db,q.usuario.id))));
 r.get('/checkins',rota(async(q,s)=>{if(q.query.aluno_id&&!id(q.query.aluno_id))throw falha('Aluno inválido.');
  const offset=pagina(q.query.offset);const pessoal=q.usuario.tipo_usuario==='aluno';let rows;
  if(pessoal)rows=(await db.query('SELECT c.*,c.semana::text FROM checkins_semanais c WHERE c.aluno_id=$1 ORDER BY c.semana DESC LIMIT 21 OFFSET $2',[q.usuario.id,offset])).rows;
  else rows=(await db.query(`SELECT c.*,c.semana::text,u.nome AS aluno_nome FROM checkins_semanais c JOIN usuarios u ON u.id=c.aluno_id WHERE ($3::bigint IS NULL OR c.aluno_id=$3) AND EXISTS(SELECT 1 FROM jsonb_array_elements(c.destinatarios) d WHERE (d->>'id')::bigint=$1 AND EXISTS(SELECT 1 FROM conexoes_alunos v WHERE v.personal_id=$1 AND v.aluno_id=c.aluno_id AND v.status='aceito' AND v.ativo AND v.ciclo=(d->>'ciclo')::int UNION ALL SELECT 1 FROM conexoes_nutri v WHERE v.nutri_id=$1 AND v.aluno_id=c.aluno_id AND v.status='aceito' AND v.ativo AND v.ciclo=(d->>'ciclo')::int)) ORDER BY c.semana DESC,c.id DESC LIMIT 21 OFFSET $2`,[q.usuario.id,offset,q.query.aluno_id||null])).rows;
  for(const c of rows.slice(0,20)){c.respostas=(await db.query(`SELECT * FROM respostas_checkin WHERE checkin_id=$1 ${pessoal?'':'AND profissional_id=$2'} ORDER BY criado_em,id`,pessoal?[c.id]:[c.id,q.usuario.id])).rows;if(!pessoal)c.destinatarios=c.destinatarios.filter(d=>String(d.id)===String(q.usuario.id));}
  s.json({checkins:rows.slice(0,20),tem_mais:rows.length>20,semana_atual:segundaRotina()});
 }));
 r.put('/checkins/:semana',aluno,rota(async(q,s)=>{
  const b=q.body,semana=q.params.semana;if(!dataValida(semana)||segundaRotina(semana)!==semana||semana>segundaRotina()||Date.parse(segundaRotina())-Date.parse(semana)>12*7*86400000)throw falha('Escolha a semana atual ou uma das 12 anteriores, começando na segunda-feira.');
  if(!Number.isInteger(b.versao)||b.versao<0||!Array.isArray(b.destinatarios)||b.destinatarios.length>20||b.destinatarios.some(v=>!id(v)))throw falha('Dados de compartilhamento ou versão inválidos.');
  const dificuldades=texto(b.dificuldades),conquistas=texto(b.conquistas),proximo=texto(b.proximo_passo),energia=b.energia==null||b.energia===''?null:Number(b.energia);if(energia!==null&&(!Number.isInteger(energia)||energia<1||energia>5))throw falha('Energia deve estar entre 1 e 5.');if(!dificuldades&&!conquistas&&!proximo&&energia===null)throw falha('Preencha ao menos um campo do check-in.');
  s.json(await transacao(db,async c=>{await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.usuario.id]);const atual=(await c.query('SELECT * FROM checkins_semanais WHERE aluno_id=$1 AND semana=$2',[q.usuario.id,semana])).rows[0];if((atual?.versao||0)!==b.versao)throw falha('O check-in mudou. Recarregue antes de salvar.',409);
   const ativos=await conexoesRotina(c,q.usuario.id),destinatarios=[...new Set(b.destinatarios.map(String))].map(v=>{const p=ativos.find(p=>String(p.id)===v);if(!p)throw falha('Selecione somente profissionais com acompanhamento ativo.',403);return p;});
   const salvo=(await c.query(`INSERT INTO checkins_semanais(aluno_id,semana,dificuldades,conquistas,proximo_passo,energia,destinatarios) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(aluno_id,semana) DO UPDATE SET dificuldades=$3,conquistas=$4,proximo_passo=$5,energia=$6,destinatarios=$7,versao=checkins_semanais.versao+1,atualizado_em=NOW() RETURNING *,semana::text`,[q.usuario.id,semana,dificuldades,conquistas,proximo,energia,JSON.stringify(destinatarios)])).rows[0];await c.query('UPDATE notificacoes SET lida_em=COALESCE(lida_em,NOW()) WHERE usuario_id=$1 AND chave=$2',[q.usuario.id,`semana:${semana}`]);return salvo;
  }));
 }));
 r.delete('/checkins/:id/compartilhamento',aluno,rota(async(q,s)=>{
  if(!id(q.params.id)||!Number.isInteger(q.body.versao))throw falha('Recarregue o check-in antes de alterar.',409);
  const r=await db.query("UPDATE checkins_semanais SET destinatarios='[]',versao=versao+1,atualizado_em=NOW() WHERE id=$1 AND aluno_id=$2 AND versao=$3 RETURNING id,versao",[q.params.id,q.usuario.id,q.body.versao]);if(!r.rows.length)throw falha('Check-in indisponível ou atualizado. Recarregue.',409);s.json(r.rows[0]);
 }));
 r.post('/checkins/:id/respostas',rota(async(q,s)=>{
  if(!['personal','nutri'].includes(q.usuario.tipo_usuario))throw falha('Somente profissionais podem responder.',403);const resposta=texto(q.body.resposta,3000);if(!id(q.params.id)||!uuid(q.body.chave_cliente)||!resposta||!Number.isInteger(q.body.versao))throw falha('Informe um retorno válido para a versão atual.');
  s.json(await transacao(db,async c=>{const ci=(await c.query('SELECT *,semana::text FROM checkins_semanais WHERE id=$1 FOR UPDATE',[q.params.id])).rows[0];if(!ci)throw falha('Check-in não encontrado.',404);const p=await vinculo(c,ci.aluno_id,q.usuario.id);if(!ci.destinatarios.some(d=>String(d.id)===String(p.id)&&d.ciclo===p.ciclo))throw falha('Este check-in não foi compartilhado com você.',403);
   const anterior=(await c.query('SELECT * FROM respostas_checkin WHERE profissional_id=$1 AND chave_cliente=$2',[q.usuario.id,q.body.chave_cliente])).rows[0];if(anterior){if(String(anterior.checkin_id)!==String(ci.id))throw falha('Chave já utilizada em outro check-in.',409);return anterior;}if(ci.versao!==q.body.versao)throw falha('O aluno revisou o check-in. Recarregue antes de responder.',409);
   return (await c.query('INSERT INTO respostas_checkin(checkin_id,profissional_id,autor_nome,referencia,resposta,chave_cliente) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[ci.id,q.usuario.id,q.usuario.nome,JSON.stringify({semana:ci.semana,versao:ci.versao,dificuldades:ci.dificuldades,conquistas:ci.conquistas,proximo_passo:ci.proximo_passo,energia:ci.energia}),resposta,q.body.chave_cliente])).rows[0];
  }));
 }));
 r.get('/retornos',aluno,rota(async(q,s)=>s.json(await retornos(db,q.usuario.id,pagina(q.query.offset)))));
 r.get('/notificacoes',rota(async(q,s)=>s.json(await notificacoes(db,q.usuario,pagina(q.query.offset)))));
 r.delete('/notificacoes',rota(async(q,s)=>{
  const {ids,todos}=q.body;
  if(!Array.isArray(ids)||ids.length>1000||ids.some(v=>!id(v))||(todos!==true&&!ids.length))throw falha('Selecione notificacoes validas.');
  const removidos=await db.query('UPDATE notificacoes SET excluida_em=NOW() WHERE excluida_em IS NULL AND usuario_id=$1 AND (($2::boolean AND NOT(id=ANY($3::bigint[]))) OR (NOT $2::boolean AND id=ANY($3::bigint[]))) RETURNING id',[q.usuario.id,todos===true,ids]);s.json({removidas:removidos.rowCount});
 }));
 r.patch('/notificacoes/:id',rota(async(q,s)=>{if(!id(q.params.id)||typeof q.body.lida!=='boolean')throw falha('Notificação inválida.');const r=await db.query('UPDATE notificacoes SET lida_em=CASE WHEN $1 THEN NOW() ELSE NULL END WHERE id=$2 AND usuario_id=$3 AND excluida_em IS NULL RETURNING id,lida_em',[q.body.lida,q.params.id,q.usuario.id]);if(!r.rows.length)throw falha('Notificação não encontrada.',404);s.json(r.rows[0]);}));
 r.get('/preferencias',rota(async(q,s)=>s.json((await db.query('SELECT * FROM preferencias_notificacao WHERE usuario_id=$1',[q.usuario.id])).rows[0]||preferencias)));
 r.put('/preferencias',rota(async(q,s)=>{const b={solicitacoes:true,...q.body};if(!Number.isInteger(b.versao)||b.versao<0||['planos','respostas','compromissos','checkins','solicitacoes'].some(k=>typeof b[k]!=='boolean'))throw falha('Preferências inválidas.');s.json(await transacao(db,async c=>{await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.usuario.id]);const atual=(await c.query('SELECT versao FROM preferencias_notificacao WHERE usuario_id=$1',[q.usuario.id])).rows[0];if((atual?.versao||0)!==b.versao)throw falha('As preferências mudaram. Recarregue.',409);return(await c.query(`INSERT INTO preferencias_notificacao(usuario_id,planos,respostas,compromissos,checkins,solicitacoes) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(usuario_id) DO UPDATE SET planos=$2,respostas=$3,compromissos=$4,checkins=$5,solicitacoes=$6,versao=preferencias_notificacao.versao+1 RETURNING *`,[q.usuario.id,b.planos,b.respostas,b.compromissos,b.checkins,b.solicitacoes])).rows[0];}));}));
 r.get('/painel',aluno,rota(async(q,s)=>{
  const usuario=q.usuario.id,hoje=hojeEvolucao();const compromissos=(await db.query(`SELECT a.id,a.data::text,a.hora_inicio,a.hora_fim,a.status,a.proposta,u.nome AS profissional_nome FROM agenda_profissional a JOIN usuarios u ON u.id=a.profissional_id WHERE a.aluno_id=$1 AND a.status IN ('pendente','confirmado','remarcacao') AND (a.data>= $2::date OR (a.proposta->>'data')::date>=$2::date) ORDER BY a.data,a.hora_inicio LIMIT 10`,[usuario,hoje])).rows;
  const visitas=(await db.query(`SELECT s.id,s.data::text,s.horario,s.status,s.tipo,u.nome AS academia_nome FROM solicitacoes_academia s JOIN usuarios u ON u.id=s.academia_id WHERE s.aluno_id=$1 AND s.status IN ('pendente','confirmada') AND s.data>=$2::date ORDER BY s.data,s.horario LIMIT 5`,[usuario,hoje])).rows;
  const ci=(await db.query('SELECT id,versao FROM checkins_semanais WHERE aluno_id=$1 AND semana=$2',[usuario,segundaRotina()])).rows[0]||null;
  s.json({hoje,semana:segundaRotina(),checkin:ci,compromissos,visitas,retornos:(await retornos(db,usuario)).retornos.slice(0,3),notificacoes:await notificacoes(db,q.usuario)});
 }));
 return r;
}
