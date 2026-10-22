import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {dataValida} from './evolucao.js';
const erro=(message,status=400)=>Object.assign(new Error(message),{status});
const origem=`FROM sessoes_treino s JOIN usuarios u ON u.id=s.aluno_id
 JOIN conexoes_alunos c ON c.aluno_id=s.aluno_id AND c.personal_id=$1 AND c.ativo AND c.status='aceito' AND c.permite_treinos
 LEFT JOIN respostas_feedback_personal r ON r.sessao_id=s.id AND r.personal_id=$1 AND r.ciclo=c.ciclo`;
const encerrada="s.status IN ('concluida','incompleta') AND btrim(s.observacoes)<>''";
export function rotasFeedbacksPersonal(db){
 const router=Router();
 const rota=f=>async(q,s)=>{try{await f(q,s);}catch(e){if(!e.status)console.error('Feedbacks:',e.message);s.status(e.status||500).json({message:e.status?e.message:'Não foi possível carregar ou salvar o feedback.'});}};
 router.use((_q,s,n)=>{s.set('Cache-Control','no-store');n();});
 router.get('/feedbacks',rota(async(q,s)=>{
  const {inicio='',fim='',aluno='',situacao=''}=q.query,offset=Number(q.query.offset||0);
  if((inicio&&!dataValida(inicio,true))||(fim&&!dataValida(fim,true))||(inicio&&fim&&fim<inicio)||(aluno&&!/^[1-9]\d*$/.test(aluno))||!['','pendente','respondido'].includes(situacao)||!Number.isSafeInteger(offset)||offset<0)throw erro('Filtros inválidos. Confira o período e o aluno.');
  const where=`WHERE ${encerrada} AND ($2='' OR s.aluno_id::text=$2)
   AND ($3='' OR s.finalizada_em >= NULLIF($3,'')::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
   AND ($4='' OR s.finalizada_em < (NULLIF($4,'')::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
   AND ($5='' OR ($5='pendente' AND r.id IS NULL) OR ($5='respondido' AND r.id IS NOT NULL))`;
  const valores=[q.usuario.id,aluno,inicio,fim,situacao];
  const rows=(await db.query(`SELECT s.id,s.aluno_id,s.titulo,s.finalizada_em,s.status,s.observacoes,s.dificuldade,s.satisfacao,s.sensacao_durante,s.sensacao_apos,u.nome,u.foto_url,r.resposta,r.criada_em AS respondida_em ${origem} ${where} ORDER BY s.finalizada_em DESC,s.id DESC LIMIT 21 OFFSET $6`,[...valores,offset])).rows;
  const resumo=(await db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE r.id IS NULL)::int AS pendentes,count(s.satisfacao)::int AS respostas_satisfacao,round(avg(s.satisfacao),1) AS satisfacao_media,count(s.dificuldade)::int AS respostas_dificuldade,round(avg(s.dificuldade),1) AS dificuldade_media,count(*) FILTER(WHERE s.status='concluida')::int AS concluidas ${origem} ${where}`,valores)).rows[0];
  s.json({feedbacks:rows.slice(0,20),tem_mais:rows.length>20,resumo});
 }));
 router.post('/feedbacks/:id/resposta',rota(async(q,s)=>{
  if(!/^[1-9]\d*$/.test(q.params.id)||typeof q.body.resposta!=='string'||!q.body.resposta.trim()||q.body.resposta.length>3000)throw erro('Escreva uma resposta de até 3.000 caracteres.');
  const c=await db.connect();try{
   await c.query('BEGIN');
   const sessao=(await c.query(`SELECT * FROM sessoes_treino WHERE id=$1 AND ${encerrada.replaceAll('s.','')} FOR UPDATE`,[q.params.id])).rows[0];
   if(!sessao)throw erro('Feedback indisponível.',404);
   const vinculo=(await c.query("SELECT ciclo FROM conexoes_alunos WHERE aluno_id=$1 AND personal_id=$2 AND ativo AND status='aceito' AND permite_treinos FOR SHARE",[sessao.aluno_id,q.usuario.id])).rows[0];
   if(!vinculo)throw erro('O aluno precisa manter o vínculo ativo e autorizar treinos.',403);
   const anterior=(await c.query('SELECT * FROM respostas_feedback_personal WHERE sessao_id=$1 AND personal_id=$2 AND ciclo=$3',[sessao.id,q.usuario.id,vinculo.ciclo])).rows[0];
   if(anterior){if(anterior.resposta!==q.body.resposta.trim())throw erro('Este feedback já recebeu resposta. Use uma orientação para complementar.',409);await c.query('COMMIT');return s.json(anterior);}
   const resposta=(await c.query('INSERT INTO respostas_feedback_personal(sessao_id,personal_id,ciclo,resposta) VALUES($1,$2,$3,$4) RETURNING *',[sessao.id,q.usuario.id,vinculo.ciclo,q.body.resposta.trim()])).rows[0];
   await c.query("INSERT INTO conversas_treino(aluno_id,personal_id,ciclo,sessao_id,referencia,tipo,texto,chave_cliente) VALUES($1,$2,$3,$4,$5,'retorno',$6,$7)",[sessao.aluno_id,q.usuario.id,vinculo.ciclo,sessao.id,JSON.stringify({titulo:sessao.titulo,data:sessao.iniciada_em,feedback:sessao.observacoes}),resposta.resposta,randomUUID()]);
   await c.query("SELECT notificar_rotina($1,'respostas',$2,'Seu personal respondeu ao feedback do treino','/aluno/treinos')",[sessao.aluno_id,`feedback:${resposta.id}`]);
   await c.query('COMMIT');s.status(201).json(resposta);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }));
 return router;
}
