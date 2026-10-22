import {Router} from 'express';
import {rota,permitir,erro,texto,tx,matricula,data,chave,auditar} from './academia-core.js';
const limites={peso:500,altura:250,cintura:300,quadril:300,torax:300,braco_direito:150,braco_esquerdo:150,coxa_direita:200,coxa_esquerda:200};
export function rotasAvaliacoesAcademia(db){
 const r=Router();
 r.use('/avaliacoes',(q,s,n)=>{try{permitir(q,'gestor','professor');n();}catch(e){s.status(e.status).json({message:e.message});}});
 r.get('/avaliacoes',rota(async(q,s)=>{await matricula(db,q,q.query.matricula_id);s.json((await db.query(`SELECT a.*,(SELECT id FROM avaliacoes_academia n WHERE n.corrige_id=a.id) AS substituida_por,u.nome AS autor FROM avaliacoes_academia a JOIN usuarios u ON u.id=a.autor_id WHERE a.academia_id=$1 AND a.matricula_id=$2 ORDER BY a.data DESC,a.id DESC`,[q.unidade,q.query.matricula_id])).rows);}));
 r.post('/avaliacoes',rota(async(q,s)=>{
  const b=q.body;const motivo=b.corrige_id?texto(b.motivo_correcao,1000,true):'';data(b.data,false);chave(b.chave_cliente);
  const responsavel=texto(b.responsavel,150,true),objetivos=texto(b.objetivos,2000),observacoes=texto(b.observacoes,4000),medidas={};
  if(!b.medidas||typeof b.medidas!=='object'||Array.isArray(b.medidas))throw erro('Informe as medidas da avaliação.');
  for(const k of Object.keys(b.medidas)){if(!Object.hasOwn(limites,k))throw erro('Medida não reconhecida.');const v=b.medidas[k];if(v===''||v==null)continue;if(!['string','number'].includes(typeof v)||!/^\d+(\.\d{1,2})?$/.test(String(v))||Number(v)<=0||Number(v)>limites[k])throw erro(`Confira a medida ${k}. Use um valor positivo com até duas casas decimais.`);medidas[k]=Number(v);}
  if(!Object.keys(medidas).length)throw erro('Preencha pelo menos uma medida.');
  s.status(201).json(await tx(db,async c=>{
   await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.unidade]);await matricula(c,q,b.matricula_id);
   const existente=(await c.query('SELECT * FROM avaliacoes_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];
   if(existente){if(String(existente.corrige_id||'')!==String(b.corrige_id||'')||existente.motivo_correcao!==motivo||String(existente.matricula_id)!==String(b.matricula_id)||new Date(existente.data).toISOString().slice(0,10)!==b.data||existente.responsavel!==responsavel||existente.objetivos!==objetivos||existente.observacoes!==observacoes||JSON.stringify(Object.entries(existente.medidas).sort())!==JSON.stringify(Object.entries(medidas).sort()))throw erro('Identificador já utilizado em outra avaliação.',409);return existente;}
   if(b.corrige_id){const anterior=(await c.query('SELECT id FROM avaliacoes_academia WHERE id=$1 AND academia_id=$2 AND matricula_id=$3 FOR UPDATE',[b.corrige_id,q.unidade,b.matricula_id])).rows[0];if(!anterior)throw erro('Avaliação não encontrada.',404);if((await c.query('SELECT id FROM avaliacoes_academia WHERE corrige_id=$1',[b.corrige_id])).rows.length)throw erro('Esta avaliação já foi corrigida. Atualize o histórico.',409);}
   const novo=(await c.query('INSERT INTO avaliacoes_academia(academia_id,matricula_id,autor_id,data,responsavel,objetivos,observacoes,medidas,chave_cliente,corrige_id,motivo_correcao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[q.unidade,b.matricula_id,q.usuario.id,b.data,responsavel,objetivos,observacoes,medidas,b.chave_cliente,b.corrige_id||null,motivo])).rows[0];
   await auditar(c,q,'avaliacao',novo.id,'registrar','Avaliação física registrada',null,{id:novo.id,matricula_id:novo.matricula_id});return novo;
  }));
 }));
 return r;
}
