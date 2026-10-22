import { Router } from 'express';
import { resumoTreinos } from './progresso-treinos.js';
import { resumoAlimentacao } from './alimentacao.js';
const falha=(texto,status=400)=>Object.assign(new Error(texto),{status});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const id=v=>/^\d+$/.test(String(v));
export const hojeEvolucao=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
export function dataValida(v,futura=false){
  return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v>='2000-01-01'&&v<='2100-12-31'&&(futura||v<=hojeEvolucao());
}
const texto=(v,max,obrigatorio=false)=>{if(v==null&&!obrigatorio)return '';if(typeof v!=='string'||v.trim().length>max||(obrigatorio&&!v.trim()))throw falha(`Informe um texto de até ${max} caracteres${obrigatorio?', não vazio':''}.`);return v.trim();};
const numero=(v,max,inteiro=false,min=0)=>{if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max||(inteiro&&!Number.isInteger(Number(v))))throw falha('Valor numérico fora do intervalo permitido.');return Number(v);};
export const indicadores={treinos:{unidade:'sessões',max:10000,inteiro:true},refeicoes:{unidade:'refeições',max:10000,inteiro:true},agua_ml:{unidade:'ml',max:10000000,inteiro:true},peso:{unidade:'kg',max:500},cintura:{unidade:'cm',max:300},quadril:{unidade:'cm',max:300},braco_direito:{unidade:'cm',max:150},braco_esquerdo:{unidade:'cm',max:150},percentual_gordura:{unidade:'%',max:100}};
const corporal=k=>!['treinos','refeicoes','agua_ml'].includes(k);
export function validarObjetivo(b){
  if(!Object.hasOwn(indicadores,b.indicador))throw falha('Indicador inválido.');
  const config=indicadores[b.indicador];
  if(!['aumentar','reduzir'].includes(b.direcao)||(!corporal(b.indicador)&&b.direcao!=='aumentar'))throw falha('Direção inválida.');
  if(!dataValida(b.inicio,true)||!dataValida(b.prazo,true)||b.inicio>b.prazo)throw falha('O prazo deve ser igual ou posterior ao início.');
  if((Date.parse(b.prazo)-Date.parse(b.inicio))/86400000>1096)throw falha('Use um período de até três anos.');
  if(!['ativo','pausado','arquivado'].includes(b.status||'ativo'))throw falha('Status inválido.');
  const alvo=numero(b.alvo,config.max,config.inteiro,0.01);
  if(!Array.isArray(b.etapas)||b.etapas.length>12)throw falha('Use até 12 etapas.');
  const etapas=b.etapas.map(e=>{if(!e||!dataValida(e.prazo,true)||e.prazo<b.inicio||e.prazo>b.prazo)throw falha('As etapas devem ficar dentro do período da meta.');return {titulo:texto(e.titulo,120,true),prazo:e.prazo,alvo:numero(e.alvo,config.max,config.inteiro,0.01)};}).sort((a,b)=>a.prazo.localeCompare(b.prazo));
  if(etapas.some((e,i)=>i>0&&(e.prazo===etapas[i-1].prazo||(b.direcao==='aumentar'?e.alvo<etapas[i-1].alvo:e.alvo>etapas[i-1].alvo))))throw falha('Use prazos distintos e valores progressivos para as etapas.');
  if(etapas.some(e=>b.direcao==='aumentar'?e.alvo>alvo:e.alvo<alvo))throw falha('A etapa não pode ultrapassar o alvo final.');
  return {titulo:texto(b.titulo,120,true),indicador:b.indicador,direcao:b.direcao,alvo,inicio:b.inicio,prazo:b.prazo,etapas,status:b.status||'ativo'};
}
export async function resumoHidratacao(db,aluno){
  const r=await db.query(`SELECT COALESCE(SUM(quantidade_ml) FILTER(WHERE data=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date),0)::int AS hoje_ml,
    COALESCE(SUM(quantidade_ml) FILTER(WHERE data>=date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND data<(date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '7 days')::date),0)::int AS semana_ml
    FROM hidratacao_aluno WHERE aluno_id=$1`,[aluno]);return r.rows[0];
}
export async function resumoMetas(db,aluno){
  const [meta,treinos,refeicoes,agua]=await Promise.all([db.query('SELECT * FROM metas_aluno WHERE aluno_id=$1',[aluno]),resumoTreinos(db,aluno),resumoAlimentacao(db,aluno),resumoHidratacao(db,aluno)]);
  return {meta:meta.rows[0]||null,progresso:{treinos_concluidos:treinos.concluidos,refeicoes_corretas:refeicoes,agua_litros:agua.semana_ml/1000,agua_hoje_litros:agua.hoje_ml/1000},semana:treinos};
}
export async function salvarMetas(db,usuario,b){
  const campos={peso_meta:500,cintura_meta:300,braco_meta:150,quadril_meta:300,percentual_gordura_meta:100,agua_litros:20,treinos_semana:100,refeicoes_semana:200};
  const valores=Object.entries(campos).map(([k,max])=>{const v=b[k];if(v==null||v==='')return k==='agua_litros'?2:k==='treinos_semana'?3:k==='refeicoes_semana'?14:null;return numero(v,max,k.endsWith('semana'),k.endsWith('_meta')?0.01:0);});
  const motivo=texto(b.motivo,1000);if(!Number.isInteger(b.versao)||b.versao<0)throw falha('Recarregue as metas antes de salvar.',409);
  const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[usuario.id]);
    const anterior=await c.query('SELECT versao FROM metas_aluno WHERE aluno_id=$1',[usuario.id]);if((anterior.rows[0]?.versao||0)!==b.versao)throw falha('As metas foram revisadas em outra tela. Recarregue.',409);
    const r=await c.query(`INSERT INTO metas_aluno(aluno_id,peso_meta,cintura_meta,braco_meta,quadril_meta,percentual_gordura_meta,agua_litros,treinos_semana,refeicoes_semana)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(aluno_id) DO UPDATE SET peso_meta=$2,cintura_meta=$3,braco_meta=$4,quadril_meta=$5,percentual_gordura_meta=$6,agua_litros=$7,treinos_semana=$8,refeicoes_semana=$9,versao=metas_aluno.versao+1,atualizado_em=NOW() RETURNING *`,[usuario.id,...valores]);
    await c.query('INSERT INTO revisoes_metas(aluno_id,versao,conteudo,motivo) VALUES($1,$2,$3,$4)',[usuario.id,r.rows[0].versao,JSON.stringify(r.rows[0]),motivo]);await c.query('COMMIT');return r.rows[0];
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function fontesObjetivos(db,aluno){
  const [treinos,refeicoes,agua,medidas]=await Promise.all([
    db.query("SELECT (finalizada_em AT TIME ZONE 'America/Sao_Paulo')::date::text AS data,COUNT(*)::int AS valor FROM sessoes_treino WHERE aluno_id=$1 AND status='concluida' GROUP BY 1 ORDER BY 1",[aluno]),
    db.query("SELECT data::text,COUNT(*)::int AS valor FROM diario_alimentar WHERE aluno_id=$1 AND status='realizada' GROUP BY 1 ORDER BY 1",[aluno]),
    db.query('SELECT data::text,SUM(quantidade_ml)::int AS valor FROM hidratacao_aluno WHERE aluno_id=$1 GROUP BY 1 ORDER BY 1',[aluno]),
    db.query('SELECT *,data_medicao::text AS data FROM medidas_aluno WHERE aluno_id=$1 ORDER BY data_medicao,id',[aluno])]);
  return {treinos:treinos.rows,refeicoes:refeicoes.rows,agua_ml:agua.rows,medidas:medidas.rows};
}
export function calcularObjetivo(o,fontes,hoje=hojeEvolucao()){
  const inicio=String(o.inicio).slice(0,10),prazo=String(o.prazo).slice(0,10),fim=prazo<hoje?prazo:hoje;
  const corpo=corporal(o.indicador),linhas=corpo?fontes.medidas.filter(m=>m[o.indicador]!=null):fontes[o.indicador];
  const base=corpo?linhas.filter(m=>m.data<=inicio).at(-1):null;
  const apurar=(limite,alvo)=>{
    const ate=limite<hoje?limite:hoje,registros=linhas.filter(m=>m.data>=inicio&&m.data<=ate);
    const ultimo=registros.at(-1),valor=corpo?(ultimo?Number(ultimo[o.indicador]):null):registros.reduce((s,r)=>s+Number(r.valor),0);
    const atingida=valor!==null&&(o.direcao==='reduzir'?valor<=alvo:valor>=alvo);
    const denominador=corpo&&base?(o.direcao==='reduzir'?Number(base[o.indicador])-alvo:alvo-Number(base[o.indicador])):null;
    const percentual=atingida?100:valor===null?null:!corpo?Math.min(100,Math.max(0,valor/alvo*100)):denominador>0?Math.min(100,Math.max(0,(o.direcao==='reduzir'?Number(base[o.indicador])-valor:valor-Number(base[o.indicador]))/denominador*100)):null;
    return {valor,atingida,percentual:percentual===null?null:Math.round(percentual),data_ultimo_registro:ultimo?.data||null,atrasada:limite<hoje&&!atingida};
  };
  return {...o,inicio,prazo,unidade:indicadores[o.indicador].unidade,base:base?{valor:Number(base[o.indicador]),data:base.data}:null,ate:fim,progresso:apurar(prazo,Number(o.alvo)),etapas:o.etapas.map(e=>({...e,progresso:apurar(e.prazo,Number(e.alvo))}))};
}
async function objetivos(db,aluno){const [r,fontes]=await Promise.all([db.query('SELECT *,inicio::text,prazo::text FROM objetivos_aluno WHERE aluno_id=$1 ORDER BY criada_em DESC,id DESC',[aluno]),fontesObjetivos(db,aluno)]);return r.rows.map(o=>calcularObjetivo(o,fontes));}
async function acessoProfissional(db,u,aluno){
  if(!['personal','nutri'].includes(u.tipo_usuario)||!id(aluno))throw falha('Acesso negado.',403);
  const personal=u.tipo_usuario==='personal',t=personal?'conexoes_alunos':'conexoes_nutri',col=personal?'personal_id':'nutri_id';
  const r=await db.query(`SELECT permite_medidas,permite_fotos,permite_metas FROM ${t} WHERE ${col}=$1 AND aluno_id=$2 AND status='aceito' AND ativo`,[u.id,aluno]);
  if(!r.rows.length)throw falha('Conexão ativa não encontrada.',403);return r.rows[0];
}
const permissoes={medida:'permite_medidas',foto:'permite_fotos',objetivo:'permite_metas',metas:'permite_metas'};
export function rotasEvolucao(db){
  const r=Router();r.use((_q,s,n)=>{s.set('Cache-Control','no-store');n();});
  const rota=fn=>async(q,s)=>{try{await fn(q,s);}catch(e){if(!e.status)console.error('Evolução:',e.message);s.status(e.status||500).json({message:e.status?e.message:'Não foi possível completar a operação. Tente novamente.'});}};
  const aluno=(q,s,n)=>q.usuario.tipo_usuario==='aluno'?n():s.status(403).json({message:'Disponível somente para alunos.'});
  r.get('/metas',aluno,rota(async(q,s)=>s.json(await resumoMetas(db,q.usuario.id))));
  r.put('/metas',aluno,rota(async(q,s)=>s.json(await salvarMetas(db,q.usuario,q.body))));
  r.get('/metas/revisoes',aluno,rota(async(q,s)=>s.json((await db.query('SELECT versao,conteudo,motivo,criada_em FROM revisoes_metas WHERE aluno_id=$1 ORDER BY versao DESC',[q.usuario.id])).rows)));
  r.get('/objetivos',aluno,rota(async(q,s)=>s.json(await objetivos(db,q.usuario.id))));
  r.post('/objetivos',aluno,rota(async(q,s)=>{
    const o=validarObjetivo(q.body),c=await db.connect();try{await c.query('BEGIN');const novo=await c.query(`INSERT INTO objetivos_aluno(aluno_id,titulo,indicador,direcao,alvo,inicio,prazo,etapas,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *,inicio::text,prazo::text`,[q.usuario.id,o.titulo,o.indicador,o.direcao,o.alvo,o.inicio,o.prazo,JSON.stringify(o.etapas),o.status]);
      await c.query('INSERT INTO revisoes_objetivos(objetivo_id,versao,conteudo,motivo) VALUES($1,1,$2,$3)',[novo.rows[0].id,JSON.stringify(novo.rows[0]),'Criação da meta']);await c.query('COMMIT');s.status(201).json(novo.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  r.put('/objetivos/:id',aluno,rota(async(q,s)=>{
    if(!id(q.params.id)||!Number.isInteger(q.body.versao))throw falha('Meta inválida.');const o=validarObjetivo(q.body),motivo=texto(q.body.motivo,1000,true),c=await db.connect();
    try{await c.query('BEGIN');const novo=await c.query(`UPDATE objetivos_aluno SET titulo=$1,indicador=$2,direcao=$3,alvo=$4,inicio=$5,prazo=$6,etapas=$7,status=$8,versao=versao+1,atualizada_em=NOW() WHERE id=$9 AND aluno_id=$10 AND versao=$11 RETURNING *,inicio::text,prazo::text`,[o.titulo,o.indicador,o.direcao,o.alvo,o.inicio,o.prazo,JSON.stringify(o.etapas),o.status,q.params.id,q.usuario.id,q.body.versao]);
      if(!novo.rows.length)throw falha('Meta não encontrada ou revisada em outra tela. Recarregue.',409);await c.query('INSERT INTO revisoes_objetivos(objetivo_id,versao,conteudo,motivo) VALUES($1,$2,$3,$4)',[novo.rows[0].id,novo.rows[0].versao,JSON.stringify(novo.rows[0]),motivo]);await c.query('COMMIT');s.json(novo.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  r.get('/objetivos/:id/revisoes',aluno,rota(async(q,s)=>{if(!id(q.params.id))throw falha('Meta inválida.');const dados=await db.query('SELECT r.* FROM revisoes_objetivos r JOIN objetivos_aluno o ON o.id=r.objetivo_id WHERE o.id=$1 AND o.aluno_id=$2 ORDER BY r.versao DESC',[q.params.id,q.usuario.id]);if(!dados.rows.length)throw falha('Meta não encontrada.',404);s.json(dados.rows);}));
  const hidratar=b=>{if(!dataValida(b.data)||b.horario&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.horario))throw falha('Data ou horário inválido.');return numero(b.quantidade_ml,5000,true,1);};
  r.get('/hidratacao',aluno,rota(async(q,s)=>{const data=q.query.data||hojeEvolucao();if(!dataValida(data))throw falha('Data inválida.');const dados=await db.query('SELECT *,data::text FROM hidratacao_aluno WHERE aluno_id=$1 AND data=$2 ORDER BY horario DESC NULLS LAST,id DESC',[q.usuario.id,data]);s.json({data,registros:dados.rows,total_ml:dados.rows.reduce((s,i)=>s+i.quantidade_ml,0)});}));
  r.post('/hidratacao',aluno,rota(async(q,s)=>{
    const ml=hidratar(q.body);if(!uuid(q.body.chave_cliente))throw falha('Identificador inválido.');const dados=await db.query(`INSERT INTO hidratacao_aluno(aluno_id,chave_cliente,data,horario,quantidade_ml) VALUES($1,$2,$3,$4,$5) ON CONFLICT(aluno_id,chave_cliente) DO NOTHING RETURNING *,data::text`,[q.usuario.id,q.body.chave_cliente,q.body.data,q.body.horario||null,ml]);
    s.status(dados.rows.length?201:200).json(dados.rows[0]||(await db.query('SELECT *,data::text FROM hidratacao_aluno WHERE aluno_id=$1 AND chave_cliente=$2',[q.usuario.id,q.body.chave_cliente])).rows[0]);
  }));
  r.put('/hidratacao/:id',aluno,rota(async(q,s)=>{if(!id(q.params.id)||!Number.isInteger(q.body.versao))throw falha('Registro inválido.');const ml=hidratar(q.body),dados=await db.query('UPDATE hidratacao_aluno SET data=$1,horario=$2,quantidade_ml=$3,versao=versao+1 WHERE id=$4 AND aluno_id=$5 AND versao=$6 RETURNING *,data::text',[q.body.data,q.body.horario||null,ml,q.params.id,q.usuario.id,q.body.versao]);if(!dados.rows.length)throw falha('Registro atualizado ou não encontrado. Recarregue.',409);s.json(dados.rows[0]);}));
  r.delete('/hidratacao/:id',aluno,rota(async(q,s)=>{if(!id(q.params.id)||!Number.isInteger(q.body.versao))throw falha('Registro inválido.');const dados=await db.query('DELETE FROM hidratacao_aluno WHERE id=$1 AND aluno_id=$2 AND versao=$3 RETURNING id',[q.params.id,q.usuario.id,q.body.versao]);if(!dados.rows.length)throw falha('Registro atualizado ou não encontrado. Recarregue.',409);s.json({message:'Registro removido.'});}));
  r.get('/serie',aluno,rota(async(q,s)=>{
    const {inicio,fim}=q.query;if(!dataValida(inicio)||!dataValida(fim)||inicio>fim||(Date.parse(fim)-Date.parse(inicio))/86400000>365)throw falha('Escolha um período de até 366 dias, encerrado até hoje.');
    const fontes=await fontesObjetivos(db,q.usuario.id),mapas=Object.fromEntries(['treinos','refeicoes','agua_ml'].map(k=>[k,new Map(fontes[k].map(i=>[i.data,i.valor]))]));
    const dias=[];for(let d=Date.parse(inicio);d<=Date.parse(fim);d+=86400000){const data=new Date(d).toISOString().slice(0,10);dias.push({data,...Object.fromEntries(Object.entries(mapas).map(([k,mapa])=>[k,mapa.get(data)||0]))});}
    s.json({inicio,fim,dias,medidas:fontes.medidas.filter(m=>m.data>=inicio&&m.data<=fim)});
  }));
  r.get('/comentarios',aluno,rota(async(q,s)=>{const offset=Number(q.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw falha('Página inválida.');const dados=await db.query('SELECT * FROM comentarios_evolucao WHERE aluno_id=$1 ORDER BY criado_em DESC,id DESC LIMIT 21 OFFSET $2',[q.usuario.id,offset]);s.json({comentarios:dados.rows.slice(0,20),tem_mais:dados.rows.length>20});}));
  r.get('/profissional/:aluno',rota(async(q,s)=>{
    const p=await acessoProfissional(db,q.usuario,q.params.aluno),dados={permissoes:p};
    if(p.permite_medidas)dados.medidas=(await db.query('SELECT m.*,m.data_medicao::text FROM medidas_aluno m WHERE aluno_id=$1 ORDER BY m.data_medicao DESC,m.id DESC',[q.params.aluno])).rows;
    if(p.permite_fotos)dados.fotos=(await db.query('SELECT f.*,f.data_registro::text FROM fotos_evolucao f WHERE aluno_id=$1 ORDER BY f.data_registro DESC,f.id DESC',[q.params.aluno])).rows;
    if(p.permite_metas){
      const resumo=await resumoMetas(db,q.params.aluno);
      dados.metas={meta:resumo.meta,progresso:resumo.progresso};
      dados.objetivos=(await objetivos(db,q.params.aluno)).map(o=>{
        if(p.permite_medidas||!corporal(o.indicador))return o;
        const restrito={valor:null,atingida:false,percentual:null,data_ultimo_registro:null,atrasada:false};
        return {...o,base:null,progresso_restrito:true,progresso:restrito,etapas:o.etapas.map(e=>({...e,progresso:restrito}))};
      });
    }
    dados.comentarios=(await db.query('SELECT * FROM comentarios_evolucao WHERE aluno_id=$1 AND profissional_id=$2 ORDER BY criado_em DESC LIMIT 100',[q.params.aluno,q.usuario.id])).rows.filter(c=>p[permissoes[c.alvo_tipo]]);s.json(dados);
  }));
  r.post('/profissional/:aluno/comentarios',rota(async(q,s)=>{
    const p=await acessoProfissional(db,q.usuario,q.params.aluno),{alvo_tipo,alvo_id}=q.body;
    if(!Object.hasOwn(permissoes,alvo_tipo)||!id(alvo_id)||!p[permissoes[alvo_tipo]])throw falha('O aluno não autorizou o acesso a este registro.',403);
    if(!uuid(q.body.chave_cliente))throw falha('Identificador inválido.');const comentario=texto(q.body.comentario,3000,true);
    const tabelas={medida:['medidas_aluno','id','data_medicao'],foto:['fotos_evolucao','id','data_registro'],objetivo:['objetivos_aluno','id','titulo'],metas:['revisoes_metas','versao','versao']};const [t,chave,ref]=tabelas[alvo_tipo];
    const alvo=await db.query(`SELECT ${ref}::text AS referencia FROM ${t} WHERE ${chave}=$1 AND aluno_id=$2`,[alvo_id,q.params.aluno]);if(!alvo.rows.length)throw falha('Registro não encontrado.',404);
    const dados=await db.query(`INSERT INTO comentarios_evolucao(aluno_id,profissional_id,autor_nome,autor_tipo,alvo_tipo,alvo_id,referencia,comentario,chave_cliente) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(profissional_id,chave_cliente) DO NOTHING RETURNING *`,[q.params.aluno,q.usuario.id,q.usuario.nome||'Profissional',q.usuario.tipo_usuario,alvo_tipo,alvo_id,alvo.rows[0].referencia,comentario,q.body.chave_cliente]);
    s.status(dados.rows.length?201:200).json(dados.rows[0]||(await db.query('SELECT * FROM comentarios_evolucao WHERE profissional_id=$1 AND chave_cliente=$2',[q.usuario.id,q.body.chave_cliente])).rows[0]);
  }));
  return r;
}
