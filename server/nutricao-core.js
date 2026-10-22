import {dataValida} from './evolucao.js';
export const falhaNutri=(message,status=400)=>Object.assign(new Error(message),{status});
export const textoNutri=(v,max=3000,obrigatorio=false)=>{if(v==null&&!obrigatorio)return '';if(typeof v!=='string'||v.length>max||(obrigatorio&&!v.trim()))throw falhaNutri(`Preencha os campos obrigatórios e use até ${max} caracteres.`);return v.trim();};
export async function acessoNutricao(db,nutri,aluno,permissao='permite_dietas'){if(!/^\d+$/.test(String(aluno)))throw falhaNutri('Paciente inválido.');const p=(await db.query("SELECT * FROM conexoes_nutri WHERE nutri_id=$1 AND aluno_id=$2 AND ativo AND status='aceito'",[nutri,aluno])).rows[0];if(!p||!p[permissao])throw falhaNutri('O paciente precisa manter vínculo ativo e autorizar este compartilhamento.',403);return p;}
export function validarAnamnese(b){
 if(!dataValida(b.data)||!['nao_informadas','nenhuma_relatada','relatadas'].includes(b.situacao_alergias))throw falhaNutri('Informe data válida e situação das alergias relatadas.');const conteudo={data:b.data,objetivos:textoNutri(b.objetivos,3000,true),rotina:textoNutri(b.rotina),preferencias:textoNutri(b.preferencias),restricoes:textoNutri(b.restricoes),situacao_alergias:b.situacao_alergias,alergias:textoNutri(b.alergias),preparo:textoNutri(b.preparo),observacoes:textoNutri(b.observacoes)};
 if(b.situacao_alergias==='relatadas'&&!conteudo.alergias)throw falhaNutri('Descreva as alergias relatadas.');const valor=b.orcamento===''||b.orcamento==null?null:Number(b.orcamento);if(valor!==null&&(!Number.isFinite(valor)||valor<0||valor>100000)||!['semanal','mensal'].includes(b.periodo_orcamento))throw falhaNutri('Orçamento inválido.');return {...conteudo,orcamento:valor,periodo_orcamento:b.periodo_orcamento};
}
export async function prepararPublicacaoNutri(db,u,aluno,b,p){
 if(u.tipo_usuario!=='nutri')return p;
 const c=await acessoNutricao(db,u.id,aluno),revisao=b.revisao_em||null;if(revisao&&!dataValida(revisao,true))throw falhaNutri('Data de revisão inválida.');let referencia=p.avaliacao_referencia||null;
 if(b.anamnese_id){const a=(await db.query('SELECT * FROM anamneses_nutri WHERE id=$1 AND nutri_id=$2 AND aluno_id=$3 AND ciclo=$4',[b.anamnese_id,u.id,aluno,c.ciclo])).rows[0];if(!a||a.versao!==b.anamnese_versao)throw falhaNutri('A anamnese mudou. Recarregue antes de publicar.',409);referencia={id:a.id,versao:a.versao,data:a.conteudo.data};}
 if(b.rascunho_id){const d=await db.query('DELETE FROM rascunhos_alimentares WHERE id=$1 AND nutri_id=$2 AND aluno_id=$3 AND ciclo=$4 AND versao=$5 RETURNING id',[b.rascunho_id,u.id,aluno,c.ciclo,b.rascunho_versao]);if(!d.rows.length)throw falhaNutri('O rascunho mudou ou já foi publicado. Recarregue.',409);}
 return (await db.query('UPDATE planos_alimentares SET avaliacao_referencia=$1,revisao_em=$2 WHERE id=$3 RETURNING *',[referencia,revisao,p.id])).rows[0];
}
