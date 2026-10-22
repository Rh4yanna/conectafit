import {referenciaImagem} from './imagens-storage.js';
import {Router} from 'express';
import {dataValida} from './evolucao.js';
import {vinculoPersonal} from './gestao-painel-personal.js';
const erro=(message,status=400)=>Object.assign(new Error(message),{status});
const limites={peso:500,altura:300,cintura:300,quadril:300,braco_direito:150,braco_esquerdo:150,percentual_gordura:100,massa_muscular:500};
const fotos=['frente_url','costas_url','lado_esquerdo_url','lado_direito_url'];
function imagem(v){if(referenciaImagem(v))return true;if(typeof v!=='string'||v.length>900000)return false;const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(v);if(!m)return false;const b=Buffer.from(m[2],'base64');if(b.toString('base64')!==m[2])return false;return m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';}
export function evolucaoPersonal(db){
 const r=Router(),rota=f=>async(q,s)=>{const c=await db.connect();try{await c.query('BEGIN');await f(q,s,c);}catch(e){await c.query('ROLLBACK');if(!e.status)console.error('Evolução personal:',e.message);if(!s.headersSent)s.status(e.status||500).json({message:e.status?e.message:'Não foi possível salvar o registro.'});}finally{c.release();}};
 // Respostas só são enviadas depois do commit nos handlers abaixo.
 r.post('/alunos/:aluno/medidas',rota(async(q,s,c)=>{
  await vinculoPersonal(c,q.usuario.id,q.params.aluno,'permite_medidas');const b=q.body,campos=Object.keys(limites),valores=campos.map(k=>b[k]==null||b[k]===''?null:Number(b[k]));
  if(!dataValida(b.data_medicao)||!valores.some(v=>v!==null)||valores.some((v,i)=>v!==null&&(!['string','number'].includes(typeof b[campos[i]])||!/^\d+(\.\d{1,2})?$/.test(String(b[campos[i]]))||!Number.isFinite(v)||v<=0||v>limites[campos[i]])))throw erro('Informe uma data e pelo menos uma medida positiva válida.');
  if(typeof b.observacoes!=='string'||b.observacoes.length>2000||typeof b.metodo!=='string'||b.metodo.length>500||(b.massa_muscular||b.percentual_gordura)&&!b.metodo.trim())throw erro('Informe o método utilizado para gordura ou massa muscular e observações de até 2.000 caracteres.');
  if(!/^[0-9a-f-]{36}$/i.test(b.chave_cliente||''))throw erro('Identificador inválido.');
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.usuario.id]);
  const antigo=(await c.query('SELECT * FROM medidas_aluno WHERE autor_personal_id=$1 AND chave_cliente=$2',[q.usuario.id,b.chave_cliente])).rows[0];
  if(antigo){if(String(antigo.aluno_id)!==q.params.aluno||new Date(antigo.data_medicao).toISOString().slice(0,10)!==b.data_medicao||campos.some((k,i)=>(antigo[k]===null?null:Number(antigo[k]))!==valores[i])||antigo.observacoes!==b.observacoes.trim()||antigo.metodo!==b.metodo.trim())throw erro('Identificador já utilizado.',409);await c.query('COMMIT');return s.json(antigo);}
  const a=(await c.query(`INSERT INTO medidas_aluno(aluno_id,autor_personal_id,data_medicao,${campos.join(',')},observacoes,metodo,chave_cliente) VALUES($1,$2,$3,${campos.map((_,i)=>'$'+(i+4)).join(',')},$12,$13,$14) RETURNING *`,[q.params.aluno,q.usuario.id,b.data_medicao,...valores,b.observacoes.trim(),b.metodo.trim(),b.chave_cliente])).rows[0];await c.query('COMMIT');s.status(201).json(a);
 }));
 r.post('/alunos/:aluno/fotos',rota(async(q,s,c)=>{await vinculoPersonal(c,q.usuario.id,q.params.aluno,'permite_fotos');const b=q.body,imagens=fotos.map(k=>b[k]||null);if(b.consentimento!==true||!dataValida(b.data_registro)||!imagens.some(Boolean)||imagens.some(v=>v&&!imagem(v)))throw erro('Confirme a autorização do aluno e envie imagens JPG, PNG ou WebP de até 650 KB com uma data válida.');
  const a=(await c.query(`INSERT INTO fotos_evolucao(aluno_id,data_registro,${fotos.join(',')},autor_personal_id,consentimento_em) VALUES($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT(aluno_id,data_registro) DO NOTHING RETURNING *`,[q.params.aluno,b.data_registro,...imagens,q.usuario.id])).rows[0];if(!a)throw erro('Já existem fotos nessa data. Escolha outra data ou consulte o registro existente.',409);await c.query('COMMIT');s.status(201).json(a);
 }));
 r.delete('/alunos/:aluno/fotos/:id',rota(async(q,s,c)=>{await vinculoPersonal(c,q.usuario.id,q.params.aluno,'permite_fotos');const a=(await c.query('DELETE FROM fotos_evolucao WHERE id=$1 AND aluno_id=$2 AND autor_personal_id=$3 RETURNING id',[q.params.id,q.params.aluno,q.usuario.id])).rows[0];if(!a)throw erro('Você pode excluir somente fotos que adicionou e ainda estão compartilhadas.',403);await c.query('COMMIT');s.json({message:'Fotos excluídas.'});}));
 return r;
}
