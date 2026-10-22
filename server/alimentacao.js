import {referenciaImagem} from './imagens-storage.js';
import {Buffer} from 'node:buffer';
import {prepararPublicacaoNutri} from './nutricao-core.js';
import { Router } from 'express';
import { normalizarRefeicao, inserirRefeicao } from './refeicoes.js';

const falha = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });
const idValido = id => /^\d+$/.test(String(id));
const uuidValido = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
function texto(v, max, obrigatorio = false) {
  if (v == null && !obrigatorio) return '';
  if (typeof v !== 'string' || v.trim().length > max || (obrigatorio && !v.trim())) throw falha(`Informe um texto ${obrigatorio ? 'não vazio ' : ''}de até ${max} caracteres.`);
  return v.trim();
}
export function normalizarPlano(body, profissional) {
  const titulo = texto(body.titulo,120,true);
  if (titulo.length < 3 || !Array.isArray(body.refeicoes) || !body.refeicoes.length || body.refeicoes.length > 12) throw falha('Informe título e de 1 a 12 refeições.');
  const refeicoes = body.refeicoes.map(ref => {
    let normal;
    try { normal = normalizarRefeicao(ref); } catch(e) { throw falha(e.message); }
    normal.alimentos = normal.alimentos.map((alimento,i) => {
      const alternativas = ref.alimentos?.[i]?.substituicoes ?? [];
      if (!Array.isArray(alternativas) || alternativas.length > 10 || (!profissional && alternativas.length)) throw falha('Somente o nutricionista pode autorizar substituições; limite de 10 por alimento.');
      return {...alimento,substituicoes:alternativas.map(a => {
        try { return normalizarRefeicao({nome:'Substituição',alimentos:[a]}).alimentos[0]; } catch(e) { throw falha(e.message); }
      })};
    });
    return normal;
  });
  const calorias = body.meta_calorias == null || body.meta_calorias === '' ? null : Number(body.meta_calorias);
  if(calorias!==null && (!Number.isInteger(calorias)||calorias<1||calorias>20000))throw falha('Meta calórica inválida.');
  return {titulo,descricao:texto(body.descricao,5000),meta_calorias:calorias,refeicoes};
}
export function listaCompras(conteudo,dias) {
  if(!Number.isInteger(dias)||dias<1||dias>30)throw falha('Escolha de 1 a 30 dias.');
  const itens = new Map();const semQuantidades=[];
  for(const ref of conteudo.refeicoes){
    if(!ref.alimentos?.length){semQuantidades.push(ref.nome);continue;}
    for(const a of ref.alimentos){
      const unidade=a.unidade||'g',quantidade=Number(a.quantidade??a.quantidade_gramas);
      if(!Number.isFinite(quantidade)||quantidade<=0){semQuantidades.push(ref.nome);continue;}
      const chave=`${a.nome.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}|${unidade}`;
      const item=itens.get(chave)||{nome:a.nome,unidade,quantidade:0};item.quantidade+=quantidade*dias;itens.set(chave,item);
    }
  }
  return {dias,itens:[...itens.values()].map(i=>({...i,quantidade:Math.round(i.quantidade*100)/100})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),sem_quantidades:[...new Set(semQuantidades)]};
}
export async function resumoAlimentacao(db,alunoId){
  const r=await db.query(`SELECT COUNT(*)::int AS realizadas FROM diario_alimentar WHERE aluno_id=$1 AND status='realizada'
    AND data>=date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    AND data<(date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '7 days')::date`,[alunoId]);
  return r.rows[0].realizadas;
}
async function acessoNutri(db,nutri,aluno){
  const r=await db.query("SELECT id,ciclo FROM conexoes_nutri WHERE nutri_id=$1 AND aluno_id=$2 AND status='aceito' AND ativo AND permite_dietas",[nutri,aluno]);
  if(!r.rows.length)throw falha('Conexão ativa e permissão para alimentação necessárias.',403);
  return r.rows[0];
}
async function planoAcessivel(db,usuario,id,editar=false){
  if(!idValido(id))throw falha('Plano inválido.');
  const r=await db.query('SELECT * FROM planos_alimentares WHERE id=$1 AND excluido_em IS NULL',[id]);
  const p=r.rows[0];if(!p)throw falha('Plano não encontrado.',404);
  if(usuario.tipo_usuario==='aluno'){
    if(String(p.aluno_id)!==String(usuario.id))throw falha('Plano não encontrado.',404);
    if(editar&&p.origem!=='pessoal')throw falha('Este plano só pode ser alterado pelo nutricionista responsável.',403);
  }else if(usuario.tipo_usuario==='nutri'){
    if(String(p.nutri_id)!==String(usuario.id)||p.origem!=='nutricionista')throw falha('Plano não encontrado.',404);
    await acessoNutri(db,usuario.id,p.aluno_id);
  }else throw falha('Perfil sem acesso.',403);
  return p;
}
async function versaoPlano(db,p,versao=p.versao){
  if(!Number.isInteger(Number(versao))||Number(versao)<1)throw falha('Versão inválida.');
  const r=await db.query('SELECT * FROM versoes_alimentares WHERE plano_id=$1 AND versao=$2',[p.id,versao]);
  if(!r.rows.length)throw falha('Versão não encontrada.',404);
  return r.rows[0];
}
async function contextoRefeicao(db,usuario,body){
  const p=await planoAcessivel(db,usuario,body.plano_id);
  const v=await versaoPlano(db,p,body.plano_versao);
  const ref=v.conteudo.refeicoes.find(r=>String(r.id)===String(body.refeicao_id));
  if(!ref)throw falha('Refeição não encontrada nesta versão.');
  return {p,contexto:{plano_id:p.id,versao:v.versao,titulo:v.conteudo.titulo,origem:v.conteudo.origem,autoria:v.conteudo.autoria,refeicao:ref}};
}
async function gravarConteudo(db,p,normal){
  await db.query('DELETE FROM refeicoes_plano WHERE plano_id=$1',[p.id]);
  const refeicoes=[];
  for(const [ordem,ref]of normal.refeicoes.entries())refeicoes.push(await inserirRefeicao(db,p.id,ref,ordem));
  const conteudo={avaliacao_referencia:p.avaliacao_referencia,revisao_em:p.revisao_em,ativo:p.ativo,motivo:p.motivo_revisao||'',titulo:p.titulo,descricao:p.descricao,meta_calorias:p.meta_calorias,origem:p.origem,autoria:p.autoria,refeicoes};
  await db.query('INSERT INTO versoes_alimentares(plano_id,versao,conteudo) VALUES($1,$2,$3)',[p.id,p.versao,JSON.stringify(conteudo)]);
  return {...p,refeicoes};
}
export async function criarPlano(db,usuario,body,alunoId=usuario.id){
  const profissional=usuario.tipo_usuario==='nutri';
  if(!['aluno','nutri'].includes(usuario.tipo_usuario)||!idValido(alunoId))throw falha('Perfil ou aluno inválido.',403);
  const normal=normalizarPlano(body,profissional);
  const c=await db.connect();
  try{
    await c.query('BEGIN');
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[alunoId]);
    if(profissional)await acessoNutri(c,usuario.id,alunoId);
    else if(String(alunoId)!==String(usuario.id))throw falha('Acesso negado.',403);
    const r=await c.query(`INSERT INTO planos_alimentares(aluno_id,nutri_id,titulo,descricao,meta_calorias,origem,autoria)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[alunoId,profissional?usuario.id:null,normal.titulo,normal.descricao,normal.meta_calorias,profissional?'nutricionista':'pessoal',usuario.nome]);
    const preparado=await prepararPublicacaoNutri(c,usuario,r.rows[0].aluno_id,body,r.rows[0]);preparado.motivo_revisao=texto(body.motivo,1000);const resultado=await gravarConteudo(c,preparado,normal);await c.query('COMMIT');return resultado;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function atualizarPlano(db,usuario,id,body,adicionar=false){
  const c=await db.connect();
  try{
    await c.query('BEGIN');
    const p=await planoAcessivel(c,usuario,id,true);
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[p.aluno_id]);
    if(!p.ativo)throw falha('Reative o plano antes de editar.',409);
    if(!Number.isInteger(body.versao)||body.versao!==p.versao)throw falha('Plano atualizado em outra tela. Recarregue antes de editar.',409);
    let entrada=body;
    if(adicionar){const v=await versaoPlano(c,p);entrada={...v.conteudo,refeicoes:[...v.conteudo.refeicoes.map(r=>({...r,horario:r.horario?.slice(0,5)})),body]};}
    const normal=normalizarPlano(entrada,usuario.tipo_usuario==='nutri');
    const r=await c.query(`UPDATE planos_alimentares SET titulo=$1,descricao=$2,meta_calorias=$3,versao=versao+1,atualizado_em=NOW()
      WHERE id=$4 AND versao=$5 AND excluido_em IS NULL RETURNING *`,[normal.titulo,normal.descricao,normal.meta_calorias,id,body.versao]);
    if(!r.rows.length)throw falha('Plano atualizado em outra tela. Recarregue.',409);
    const preparado=await prepararPublicacaoNutri(c,usuario,r.rows[0].aluno_id,body,r.rows[0]);preparado.motivo_revisao=texto(body.motivo,1000);const resultado=await gravarConteudo(c,preparado,normal);await c.query('COMMIT');return resultado;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
function fotoValida(foto){
  if(referenciaImagem(foto))return foto;
  if(foto==null||foto==='')return null;
  if(typeof foto!=='string'||foto.length>2100000)throw falha('Foto muito grande. Use até 1,5 MB.');
  const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(foto);
  if(!m)throw falha('Use uma imagem JPEG, PNG ou WebP.');
  const b=Buffer.from(m[2],'base64');
  const ok=m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
  if(!ok||b.length>1572864)throw falha('Foto inválida ou maior que 1,5 MB.');return foto;
}
export function validarDiario(body){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.data||'')||!Number.isFinite(Date.parse(body.data))||new Date(body.data).toISOString().slice(0,10)!==body.data)throw falha('Data inválida.');
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  if(body.data>hoje||body.data<'2000-01-01')throw falha('Use uma data passada ou de hoje.');
  if(body.horario&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.horario))throw falha('Horário inválido.');
  if(!['realizada','parcial','nao_realizada'].includes(body.status))throw falha('Selecione como foi a refeição.');
  const escala=v=>{if(v==null||v==='')return null;if(!Number.isInteger(Number(v))||Number(v)<0||Number(v)>10)throw falha('Use a escala de 0 a 10.');return Number(v);};
  return {data:body.data,horario:body.horario||null,nome:texto(body.nome,100,true),status:body.status,observacoes:texto(body.observacoes,2000),dificuldades:texto(body.dificuldades,2000),fome:escala(body.fome),saciedade:escala(body.saciedade),foto:fotoValida(body.foto)};
}
const camposDiario="id,aluno_id,chave_cliente,plano_id,plano_versao,refeicao_id,contexto,data::text,horario,nome,status,observacoes,dificuldades,fome,saciedade,(foto IS NOT NULL) AS tem_foto,versao,criado_em,atualizado_em";
export function rotasAlimentacao(db){
  const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const rota=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){if(!e.status)console.error('Alimentação:',e.message);res.status(e.status||500).json({message:e.status?e.message:'Não foi possível completar a operação. Tente novamente.'});}};
  const aluno=(req,_res,next)=>req.usuario.tipo_usuario==='aluno'?next():_res.status(403).json({message:'Disponível somente para alunos.'});
  router.get('/planos',rota(async(req,res)=>{
    const profissional=req.usuario.tipo_usuario==='nutri';const alunoId=profissional?req.query.aluno_id:req.usuario.id;
    if(!idValido(alunoId))throw falha('Aluno inválido.');if(profissional)await acessoNutri(db,req.usuario.id,alunoId);
    const r=await db.query(`SELECT p.*,v.conteudo->'refeicoes' AS refeicoes FROM planos_alimentares p JOIN versoes_alimentares v ON v.plano_id=p.id AND v.versao=p.versao
      WHERE p.aluno_id=$1 AND p.excluido_em IS NULL ${profissional?'AND p.nutri_id=$2':''} ORDER BY p.vigente DESC,p.atualizado_em DESC,p.id DESC`,profissional?[alunoId,req.usuario.id]:[alunoId]);res.json(r.rows);
  }));
  router.post('/planos',rota(async(req,res)=>res.status(201).json(await criarPlano(db,req.usuario,req.body,req.usuario.tipo_usuario==='nutri'?req.body.aluno_id:req.usuario.id))));
  router.put('/planos/:id',rota(async(req,res)=>res.json(await atualizarPlano(db,req.usuario,req.params.id,req.body))));
  router.post('/planos/:id/refeicoes',rota(async(req,res)=>res.status(201).json(await atualizarPlano(db,req.usuario,req.params.id,req.body,true))));
  router.delete('/planos/:id',aluno,rota(async(req,res)=>{
    await planoAcessivel(db,req.usuario,req.params.id,true);
    const r=await db.query('UPDATE planos_alimentares SET excluido_em=NOW(),vigente=FALSE,ativo=FALSE WHERE id=$1 AND versao=$2 AND excluido_em IS NULL RETURNING id',[req.params.id,req.body.versao]);
    if(!r.rows.length)throw falha('Plano alterado. Recarregue antes de excluir.',409);res.json({message:'Plano removido da lista. Registros do diário preservados.'});
  }));
  router.put('/planos/:id/vigente',rota(async(req,res)=>{
    const c=await db.connect();try{await c.query('BEGIN');let p=await planoAcessivel(c,req.usuario,req.params.id);await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[p.aluno_id]);p=await planoAcessivel(c,req.usuario,req.params.id);
      if(!p.ativo)throw falha('Plano arquivado.');await c.query('UPDATE planos_alimentares SET vigente=FALSE WHERE aluno_id=$1 AND vigente',[p.aluno_id]);await c.query('UPDATE planos_alimentares SET vigente=TRUE WHERE id=$1',[p.id]);await c.query('COMMIT');res.json({message:'Plano definido para acompanhamento atual.'});
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  router.get('/planos/:id/versoes',rota(async(req,res)=>{const p=await planoAcessivel(db,req.usuario,req.params.id);res.json((await db.query('SELECT versao,criado_em,conteudo FROM versoes_alimentares WHERE plano_id=$1 ORDER BY versao DESC',[p.id])).rows);}));
  router.get('/planos/:id/compras',rota(async(req,res)=>{const p=await planoAcessivel(db,req.usuario,req.params.id);const v=await versaoPlano(db,p,req.query.versao??p.versao);res.json({...listaCompras(v.conteudo,Number(req.query.dias||7)),titulo:v.conteudo.titulo,versao:v.versao});}));
  router.get('/diario',aluno,rota(async(req,res)=>{
    const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw falha('Página inválida.');
    const r=await db.query(`SELECT ${camposDiario} FROM diario_alimentar WHERE aluno_id=$1 ORDER BY data DESC,horario DESC NULLS LAST,id DESC LIMIT 21 OFFSET $2`,[req.usuario.id,offset]);
    res.json({registros:r.rows.slice(0,20),tem_mais:r.rows.length>20,realizadas_semana:await resumoAlimentacao(db,req.usuario.id)});
  }));
  router.get('/diario/:id/foto',aluno,rota(async(req,res)=>{if(!idValido(req.params.id))throw falha('Registro inválido.');const r=await db.query('SELECT foto FROM diario_alimentar WHERE id=$1 AND aluno_id=$2',[req.params.id,req.usuario.id]);if(!r.rows.length)throw falha('Registro não encontrado.',404);res.json(r.rows[0]);}));
  router.post('/diario',aluno,rota(async(req,res)=>{
    const n=validarDiario(req.body);if(!uuidValido(req.body.chave_cliente))throw falha('Identificador de registro inválido.');
    let contexto=null,p=null;
    if(req.body.plano_id!=null){({p,contexto}=await contextoRefeicao(db,req.usuario,req.body));}
    const r=await db.query(`INSERT INTO diario_alimentar(aluno_id,chave_cliente,plano_id,plano_versao,refeicao_id,contexto,data,horario,nome,status,observacoes,dificuldades,fome,saciedade,foto)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(aluno_id,chave_cliente) DO NOTHING RETURNING ${camposDiario}`,
    [req.usuario.id,req.body.chave_cliente,p?.id||null,contexto?.versao||null,contexto?.refeicao.id||null,contexto?JSON.stringify(contexto):null,n.data,n.horario,n.nome,n.status,n.observacoes,n.dificuldades,n.fome,n.saciedade,n.foto]);
    if(!r.rows.length){const anterior=await db.query(`SELECT ${camposDiario} FROM diario_alimentar WHERE aluno_id=$1 AND chave_cliente=$2`,[req.usuario.id,req.body.chave_cliente]);return res.json(anterior.rows[0]);}
    res.status(201).json(r.rows[0]);
  }));
  router.put('/diario/:id',aluno,rota(async(req,res)=>{
    if(!idValido(req.params.id)||!Number.isInteger(req.body.versao))throw falha('Registro inválido.');const n=validarDiario(req.body);
    const r=await db.query(`UPDATE diario_alimentar SET data=$1,horario=$2,nome=$3,status=$4,observacoes=$5,dificuldades=$6,fome=$7,saciedade=$8,
      foto=CASE WHEN $9 THEN $10 ELSE foto END,versao=versao+1,atualizado_em=NOW() WHERE id=$11 AND aluno_id=$12 AND versao=$13 RETURNING ${camposDiario}`,
    [n.data,n.horario,n.nome,n.status,n.observacoes,n.dificuldades,n.fome,n.saciedade,Object.hasOwn(req.body,'foto'),n.foto,req.params.id,req.usuario.id,req.body.versao]);
    if(!r.rows.length)throw falha('Registro não encontrado ou atualizado em outra tela. Recarregue.',409);res.json(r.rows[0]);
  }));
  router.delete('/diario/:id',aluno,rota(async(req,res)=>{
    if(!idValido(req.params.id)||!Number.isInteger(req.body.versao))throw falha('Registro inválido.');
    const r=await db.query('DELETE FROM diario_alimentar WHERE id=$1 AND aluno_id=$2 AND versao=$3 RETURNING id',[req.params.id,req.usuario.id,req.body.versao]);if(!r.rows.length)throw falha('Registro atualizado ou não encontrado. Recarregue.',409);res.json({message:'Registro excluído.'});
  }));
  router.get('/duvidas',rota(async(req,res)=>{
    const offset=Number(req.query.offset||0),paginado=req.query.paginado==='true',limite=paginado?21:100;if(!Number.isSafeInteger(offset)||offset<0)throw falha('Página inválida.');let rows;
    if(req.usuario.tipo_usuario==='nutri'){
      if(!idValido(req.query.aluno_id))throw falha('Paciente inválido.');const c=await acessoNutri(db,req.usuario.id,req.query.aluno_id);
      rows=(await db.query('SELECT * FROM duvidas_alimentares WHERE aluno_id=$1 AND nutri_id=$2 AND ciclo=$3 ORDER BY criada_em DESC,id DESC LIMIT $4 OFFSET $5',[req.query.aluno_id,req.usuario.id,c.ciclo,limite,offset])).rows;
    }else rows=(await db.query('SELECT * FROM duvidas_alimentares WHERE aluno_id=$1 ORDER BY criada_em DESC,id DESC LIMIT $2 OFFSET $3',[req.usuario.id,limite,offset])).rows;
    res.json(paginado?{duvidas:rows.slice(0,20),tem_mais:rows.length>20}:rows);
  }));
  router.post('/duvidas',aluno,rota(async(req,res)=>{
    const pergunta=texto(req.body.pergunta,2000,true);if(!uuidValido(req.body.chave_cliente))throw falha('Identificador inválido.');
    const {p,contexto}=await contextoRefeicao(db,req.usuario,req.body);if(p.origem!=='nutricionista'||!p.nutri_id)throw falha('Esta refeição não possui nutricionista responsável.');const vinculo=await acessoNutri(db,p.nutri_id,req.usuario.id);
    const r=await db.query(`INSERT INTO duvidas_alimentares(aluno_id,nutri_id,chave_cliente,plano_id,contexto,pergunta,ciclo) VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(aluno_id,chave_cliente) DO NOTHING RETURNING *`,[req.usuario.id,p.nutri_id,req.body.chave_cliente,p.id,JSON.stringify(contexto),pergunta,vinculo.ciclo]);
    res.status(r.rows.length?201:200).json(r.rows[0]||(await db.query('SELECT * FROM duvidas_alimentares WHERE aluno_id=$1 AND chave_cliente=$2',[req.usuario.id,req.body.chave_cliente])).rows[0]);
  }));
  router.put('/duvidas/:id/resposta',rota(async(req,res)=>{
    if(req.usuario.tipo_usuario!=='nutri')throw falha('Somente o nutricionista responsável pode responder.',403);if(!idValido(req.params.id))throw falha('Dúvida inválida.');
    const resposta=texto(req.body.resposta,3000,true);const r=await db.query('SELECT * FROM duvidas_alimentares WHERE id=$1 AND nutri_id=$2',[req.params.id,req.usuario.id]);if(!r.rows.length)throw falha('Dúvida não encontrada.',404);
    const vinculo=await acessoNutri(db,req.usuario.id,r.rows[0].aluno_id);if(vinculo.ciclo!==r.rows[0].ciclo)throw falha('Dúvida de um ciclo anterior de acompanhamento.',403);
    const atual=await db.query('UPDATE duvidas_alimentares SET resposta=$1,respondida_em=NOW() WHERE id=$2 AND resposta IS NULL RETURNING *',[resposta,req.params.id]);if(!atual.rows.length)throw falha('Esta dúvida já foi respondida. Recarregue.',409);res.json(atual.rows[0]);
  }));
  return router;
}
