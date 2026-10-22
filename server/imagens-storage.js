import crypto from 'node:crypto';
import sharp from 'sharp';
export const referenciaImagem = v => typeof v==='string' && /^\/api\/midia\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const erro=(message,status=400)=>Object.assign(new Error(message),{status});
const camposEvolucao=['frente_url','costas_url','lado_esquerdo_url','lado_direito_url'];

export async function validarImagem(data, limite=1572864) {
 if(typeof data!=='string'||data.length>Math.ceil(limite/3)*4+50)throw erro('Imagem muito grande.');
 const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
 if(!m)throw erro('Envie uma imagem JPEG, PNG ou WebP.');
 const bytes=Buffer.from(m[2],'base64');
 if(bytes.toString('base64')!==m[2]||bytes.length>limite)throw erro('Imagem inválida ou muito grande.');
 try {
  const info=await sharp(bytes,{limitInputPixels:16000000,failOn:'warning'}).metadata();
  if(info.format!==m[1]||(info.pages||1)!==1)throw new Error('Formato inválido');
  // Decodifica completamente e remove EXIF/GPS e conteúdo anexado.
  const buffer=await sharp(bytes,{limitInputPixels:16000000,failOn:'warning'}).rotate().webp({quality:85}).toBuffer();
  if(buffer.length>4194304)throw new Error('Imagem muito grande');
  return {buffer,mime:'image/webp',sha256:crypto.createHash('sha256').update(buffer).digest('hex')};
 }catch {throw erro('O conteúdo da imagem é inválido, animado ou excede 16 megapixels.');}
}

export async function gravarImagem(db, storage, usuario, dono, finalidade, data, limite) {
 const validada=await validarImagem(data,limite);
 const existente=(await db.query("SELECT id FROM imagens_storage WHERE dono_id=$1 AND finalidade=$2 AND sha256=$3 AND estado='pronta' AND bucket=$4 LIMIT 1",[dono,finalidade,validada.sha256,storage.bucket])).rows[0];
 if(existente)return `/api/midia/${existente.id}`;
 const id=crypto.randomUUID(), caminho=`${finalidade}/${dono}/${id}.webp`;
 // Registrar antes de enviar permite localizar inclusive uploads interrompidos.
 await db.query('INSERT INTO imagens_storage(id,dono_id,autor_id,finalidade,caminho,bucket,sha256,mime,tamanho) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,dono,usuario.id,finalidade,caminho,storage.bucket,validada.sha256,validada.mime,validada.buffer.length]);
 try {
  await storage.salvar(caminho,validada.buffer,validada.mime);
  await db.query("UPDATE imagens_storage SET estado='pronta' WHERE id=$1",[id]);
 }catch {throw erro('Não foi possível enviar a imagem. Seus dados não foram substituídos. Tente novamente.',503);}
 return `/api/midia/${id}`;
}

export async function vinculoImagem(db, profissional, aluno, finalidade) {
 const tipo=profissional.tipo_usuario;
 if(!['personal','nutri'].includes(tipo))return false;
 if(finalidade==='refeicao'&&tipo!=='nutri')return false;
 const tabela=tipo==='personal'?'conexoes_alunos':'conexoes_nutri';
 const coluna=tipo==='personal'?'personal_id':'nutri_id';
 const cond=finalidade==='refeicao'?'AND permite_diario AND permite_fotos_refeicoes':finalidade==='evolucao'?'AND permite_fotos':'';
 return (await db.query(`SELECT 1 FROM ${tabela} WHERE ${coluna}=$1 AND aluno_id=$2 AND status='aceito' AND ativo ${cond}`,[profissional.id,aluno])).rowCount>0;
}

// Verificar a referência atual revoga acesso às imagens substituídas imediatamente.
export async function imagemReferenciada(db, item) {
 const ref=`/api/midia/${item.id}`, dono=item.dono_id;
 if(item.finalidade==='perfil')return (await db.query(`SELECT 1 FROM usuarios WHERE id=$1 AND foto_url=$2 UNION ALL SELECT 1 FROM perfis_personal WHERE usuario_id=$1 AND foto_perfil=$2 UNION ALL SELECT 1 FROM perfis_nutri WHERE usuario_id=$1 AND foto_perfil=$2 UNION ALL SELECT 1 FROM perfis_academia WHERE usuario_id=$1 AND foto_perfil=$2`,[dono,ref])).rowCount>0;
 if(item.finalidade==='galeria')return (await db.query('SELECT 1 FROM fotos_academia f JOIN perfis_academia p ON p.id=f.academia_id WHERE p.usuario_id=$1 AND f.foto_url=$2',[dono,ref])).rowCount>0;
 if(item.finalidade==='refeicao')return (await db.query('SELECT 1 FROM diario_alimentar WHERE aluno_id=$1 AND foto=$2',[dono,ref])).rowCount>0;
 return (await db.query(`SELECT 1 FROM fotos_evolucao WHERE aluno_id=$1 AND $2 IN (${camposEvolucao.join(',')})`,[dono,ref])).rowCount>0;
}

export function servirImagem(db, storage) {return async(q,s)=>{
 try {
  if(!referenciaImagem(`/api/midia/${q.params.id}`))throw erro('Imagem não encontrada.',404);
  const item=(await db.query("SELECT i.*,u.tipo_usuario FROM imagens_storage i LEFT JOIN usuarios u ON u.id=i.dono_id WHERE i.id=$1 AND i.estado='pronta'",[q.params.id])).rows[0];
  if(!item||!item.dono_id||!await imagemReferenciada(db,item))throw erro('Imagem não encontrada.',404);
  const propria=String(item.dono_id)===String(q.usuario.id);
  const catalogo=['perfil','galeria'].includes(item.finalidade)&&['personal','nutri','academia'].includes(item.tipo_usuario)&&q.usuario.tipo_usuario==='aluno';
  if(!propria&&!catalogo&&!await vinculoImagem(db,q.usuario,item.dono_id,item.finalidade))throw erro('Imagem não encontrada.',404);
  if(!storage||item.bucket!==storage.bucket)throw erro('Armazenamento de imagens indisponível.',503);
  const bytes=await storage.ler(item.caminho);
  s.set({'Content-Type':item.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(bytes);
 }catch(e){s.status(e.status||503).json({message:e.status?e.message:'Não foi possível carregar a imagem.'});}
 };}

export function fluxoImagem(path, metodo, usuario, body) {
 if(!['POST','PUT','PATCH'].includes(metodo))return null;
 const dono=usuario.id;
 const perfil={ '/api/aluno/perfil':'aluno','/api/personal/perfil':'personal','/api/nutri/perfil/me':'nutri','/api/academia/perfil':'academia'}[path];
 if(perfil){if(usuario.tipo_usuario!==perfil)throw erro('Perfil não autorizado.',403);return {dono,campos:[[perfil==='aluno'?'foto_url':'foto_perfil','perfil']],galeria:perfil==='academia',limite:650*1024};}
 if(path==='/api/aluno/fotos'){if(usuario.tipo_usuario!=='aluno')throw erro('Perfil não autorizado.',403);return {dono,campos:camposEvolucao.map(k=>[k,'evolucao']),limite:650*1024};}
 const p=/^\/api\/personal\/alunos\/(\d+)\/fotos$/.exec(path);
 if(p){if(usuario.tipo_usuario!=='personal')throw erro('Perfil não autorizado.',403);if(body.consentimento!==true)throw erro('Autorização do aluno obrigatória.');return {dono:p[1],profissional:true,campos:camposEvolucao.map(k=>[k,'evolucao']),limite:650*1024};}
 if(/^\/api\/(alimentacao|dietas)\/diario(?:\/\d+)?$/.test(path)){if(usuario.tipo_usuario!=='aluno')throw erro('Perfil não autorizado.',403);return {dono,campos:[['foto','refeicao']],limite:1572864};}
 return null;
}

export function processarImagens(db,storage) {return async(q,s,next)=>{
 try {
  const fluxo=fluxoImagem(q.path.toLowerCase().replace(/\/$/,''),q.method,q.usuario,q.body);
  if(!fluxo)return next();
  if(fluxo.profissional&&!await vinculoImagem(db,q.usuario,fluxo.dono,'evolucao'))throw erro('Fotos não compartilhadas com este profissional.',403);
  const converter=async(v,finalidade)=>{
   if(v==null||v==='')return v;
   if(referenciaImagem(v)){
    const item=(await db.query("SELECT 1 FROM imagens_storage WHERE id=$1 AND dono_id=$2 AND finalidade=$3 AND estado='pronta'",[v.split('/').pop(),fluxo.dono,finalidade])).rows[0];
    if(!item)throw erro('Referência de imagem não autorizada.',403);
    return v;
   }
   if(typeof v==='string'&&v.startsWith('data:'))return storage?await gravarImagem(db,storage,q.usuario,fluxo.dono,finalidade,v,fluxo.limite):v;
   // URLs HTTPS legadas só são mantidas se já pertencem ao cadastro; nunca buscar URL arbitrária.
   if(['perfil','galeria'].includes(finalidade)&&typeof v==='string'&&v.startsWith('https://')){
    const table={aluno:['usuarios','foto_url','id'],personal:['perfis_personal','foto_perfil','usuario_id'],nutri:['perfis_nutri','foto_perfil','usuario_id'],academia:['perfis_academia','foto_perfil','usuario_id']}[q.usuario.tipo_usuario];
    const ok=finalidade==='galeria'?(await db.query('SELECT 1 FROM fotos_academia f JOIN perfis_academia p ON p.id=f.academia_id WHERE p.usuario_id=$1 AND f.foto_url=$2',[fluxo.dono,v])).rowCount:(await db.query(`SELECT 1 FROM ${table[0]} WHERE ${table[2]}=$1 AND ${table[1]}=$2`,[fluxo.dono,v])).rowCount;
    if(ok)return v;
   }
   throw erro('Selecione uma imagem válida no dispositivo.');
  };
  for(const [key,purpose] of fluxo.campos)if(Object.hasOwn(q.body,key))q.body[key]=await converter(q.body[key],purpose);
  if(fluxo.galeria&&Array.isArray(q.body.fotos)){
   if(q.body.fotos.length>11)throw erro('Use até 11 imagens na galeria.');
   for(let i=0;i<q.body.fotos.length;i++)q.body.fotos[i]=await converter(q.body.fotos[i],'galeria');
  }
  next();
 }catch(e){s.status(e.status||500).json({message:e.status?e.message:'Não foi possível preparar as imagens.'});}
 };}
