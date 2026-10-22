import {dataValida,hojeEvolucao} from './evolucao.js';
export const erro=(message,status=400)=>Object.assign(new Error(message),{status});
export const texto=(v,max=2000,obrigatorio=false)=>{if(v==null&&!obrigatorio)return '';if(typeof v!=='string'||v.trim().length>max||obrigatorio&&!v.trim())throw erro('Confira os campos de texto.');return v.trim();};
export const dinheiro=v=>{if(!/^\d+(\.\d{1,2})?$/.test(String(v))||Number(v)>99999999.99)throw erro('Valor monetário inválido.');return Math.round(Number(v)*100);};
export const data=(v,futuro=true)=>{if(!dataValida(v,futuro))throw erro('Data inválida.');return v;};
export const chave=v=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||''))throw erro('Identificador da operação inválido.');return v;};
export const rota=fn=>async(q,s,n)=>{try{await fn(q,s,n);}catch(e){s.status(e.status|| (e.code==='23505'?409:400)).json({message:e.status?e.message:e.code==='23505'?'Registro duplicado. Confira os dados.':'Não foi possível concluir a operação. Confira os dados.'});}};
export async function tx(db,fn){const c=await db.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function auditar(db,q,entidade,id,acao,motivo,antes,depois){await db.query('INSERT INTO auditoria_academia(academia_id,autor_id,entidade,registro_id,acao,motivo,antes,depois) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[q.unidade,q.usuario.id,entidade,id,acao,motivo,antes||null,depois||null]);}
export const permitir=(q,...papeis)=>{if(!papeis.includes(q.papel))throw erro('Sua função não permite esta operação.',403);};
export async function matricula(db,q,id,lock=false){const m=(await db.query(`SELECT *,inicio::text,termino::text FROM matriculas_academia WHERE id=$1 AND academia_id=$2 ${lock?'FOR UPDATE':''}`,[id,q.unidade])).rows[0];if(!m)throw erro('Matrícula não encontrada.',404);return m;}
export function cadastro(b){const nome=texto(b.nome,120,true),email=texto(b.email,254,true).toLowerCase(),telefone=texto(b.telefone,30);if(nome.length<3||!/^\S+@\S+\.\S+$/.test(email))throw erro('Informe nome e e-mail válidos.');return {nome,email,telefone};}
export function ativa(m,d=hojeEvolucao()){return m.situacao==='ativa'&&(!m.inicio||m.inicio<=d)&&(!m.termino||m.termino>=d);}
