import {Router} from 'express';
import {dataValida} from './evolucao.js';
export function painelProfissional(db){
 const r=Router();
 r.get('/calendario',async(q,s)=>{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(q.query.mes||''))return s.status(400).json({message:'Mês inválido.'});
  try{const {rows}=await db.query(`SELECT id::text,data::text,horario::text,observacao FROM compromissos_profissionais WHERE profissional_id=$1 AND data>=($2||'-01')::date AND data<(($2||'-01')::date+INTERVAL '1 month') ORDER BY data,horario`,[q.usuario.id,q.query.mes]);
   const existentes=await db.query(`SELECT 'atendimento-'||id AS id,data::text,hora_inicio::text AS horario,COALESCE(NULLIF(observacao,''),aluno_nome) AS observacao FROM agenda_profissional WHERE profissional_id=$1 AND status<>'cancelado' AND data>=($2||'-01')::date AND data<(($2||'-01')::date+INTERVAL '1 month') ORDER BY data,hora_inicio`,[q.usuario.id,q.query.mes]);
   s.json([...rows,...existentes.rows].sort((a,b)=>(a.data+a.horario).localeCompare(b.data+b.horario)));
  }catch{s.status(500).json({message:'Não foi possível carregar a agenda.'});}
 });
 r.post('/calendario',async(q,s)=>{
  const {data,horario,observacao}=q.body;
  if(!dataValida(data,true)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario||'')||typeof observacao!=='string'||!observacao.trim()||observacao.length>2000)return s.status(400).json({message:'Preencha data, horário e observação válidos.'});
  try{const r=await db.query('INSERT INTO compromissos_profissionais(profissional_id,data,horario,observacao) VALUES($1,$2,$3,$4) RETURNING id',[q.usuario.id,data,horario,observacao.trim()]);s.status(201).json(r.rows[0]);}
  catch(e){s.status(e.code==='23505'?409:500).json({message:e.code==='23505'?'Já existe um compromisso nesse horário.':'Não foi possível salvar o compromisso.'});}
 });
 return r;
}
