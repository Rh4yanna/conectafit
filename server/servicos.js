import {Router} from 'express';
import {dataValida,hojeEvolucao} from './evolucao.js';
const falha=(m,status=400)=>Object.assign(new Error(m),{status});
const id=v=>/^\d+$/.test(String(v))&&Number.isSafeInteger(Number(v))&&Number(v)>0;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const normalizar=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const texto=(v,max)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw falha(`Use até ${max} caracteres.`);return v.trim();};
export function validarOferta(b,tipo){
  const lista=v=>{if(!Array.isArray(v)||v.length>12)throw falha('Use até 12 itens por campo.');return [...new Map(v.map(x=>{const s=texto(x,60);if(!s)throw falha('Remova itens vazios.');return[normalizar(s),s];})).values()];};
  const horario=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if(!Array.isArray(b.disponibilidade)||b.disponibilidade.length>21)throw falha('Use até 21 faixas de disponibilidade.');
  const disponibilidade=b.disponibilidade.map(d=>{if(!d||!Number.isInteger(d.dia)||d.dia<0||d.dia>6||!horario(d.inicio)||!horario(d.fim)||d.inicio>=d.fim)throw falha('Informe dia, início e fim válidos para a disponibilidade.');return{dia:d.dia,inicio:d.inicio,fim:d.fim};}).sort((a,b)=>a.dia-b.dia||a.inicio.localeCompare(b.inicio));
  if(disponibilidade.some((d,i)=>i&&d.dia===disponibilidade[i-1].dia&&d.inicio<disponibilidade[i-1].fim))throw falha('Os horários do mesmo dia não podem se sobrepor.');
  if(b.aceita_novos!==null&&typeof b.aceita_novos!=='boolean')throw falha('Informe a disponibilidade para novos clientes.');
  if(!Array.isArray(b.atendimento)||b.atendimento.some(a=>!['presencial','online','domicilio'].includes(a)))throw falha('Forma de atendimento inválida.');
  if(typeof b.recebe_visitas!=='boolean'||typeof b.oferece_experimental!=='boolean')throw falha('Opção de visita inválida.');
  if(tipo!=='academia'&&(b.recebe_visitas||b.oferece_experimental))throw falha('Somente academias podem oferecer visitas ou aulas experimentais.');
  const valor=v=>{if(v==null||v==='')return null;if(!['number','string'].includes(typeof v)||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100000)throw falha('Preço inválido.');return Math.round(Number(v)*100)/100;};
  return {servicos:lista(b.servicos||[]),especialidades:lista(b.especialidades),objetivos:lista(b.objetivos),modalidades:lista(b.modalidades),atendimento:[...new Set(b.atendimento)],disponibilidade,aceita_novos:b.aceita_novos,recebe_visitas:b.recebe_visitas,oferece_experimental:b.oferece_experimental,valor_visita:valor(b.valor_visita),valor_experimental:valor(b.valor_experimental),condicoes:texto(b.condicoes,2000)};
}
export async function catalogoServicos(db){
  const r=await db.query(`SELECT u.id::text AS id,CASE WHEN u.tipo_usuario='nutri' THEN 'nutricionista' ELSE u.tipo_usuario END AS tipo,
    COALESCE(pp.nome,pn.nome,pa.nome,u.nome) AS nome,COALESCE(NULLIF(l.cidade,''),pp.cidade,pn.cidade,pa.cidade,u.cidade,'') AS cidade,
    COALESCE(NULLIF(pp.foto_perfil,''),NULLIF(pn.foto_perfil,''),NULLIF(pa.foto_perfil,''),(SELECT foto_url FROM fotos_academia WHERE academia_id=pa.id ORDER BY id DESC LIMIT 1),u.foto_url) AS foto,
    COALESCE(pp.whatsapp,pn.whatsapp,pa.whatsapp) AS whatsapp,COALESCE(pp.instagram,pn.instagram,pa.instagram) AS instagram,pa.endereco,
    COALESCE(pp.sobre_mim,pn.bio,pa.bio,'') AS descricao,COALESCE(pp.formacao,pn.formacao) AS formacao,
    COALESCE(pp.preco_diaria,pn.preco_diaria,pa.preco_diaria) AS preco_diaria,COALESCE(pp.preco_semanal,pn.preco_semanal) AS preco_semanal,
    COALESCE(pp.preco_mensal,pn.preco_mensal,pa.preco_mensal) AS preco_mensal,COALESCE(pp.preco_anual,pn.preco_anual,pa.preco_anual) AS preco_anual,
    COALESCE(o.servicos,'[]') AS servicos,COALESCE(o.especialidades,'[]') AS especialidades,COALESCE(o.objetivos,'[]') AS objetivos,COALESCE(o.modalidades,pa.modalidades,'[]') AS modalidades,
    COALESCE(o.atendimento,'[]') AS atendimento,COALESCE(o.disponibilidade,'[]') AS disponibilidade,o.aceita_novos,
    COALESCE(o.recebe_visitas,FALSE) AS recebe_visitas,COALESCE(o.oferece_experimental,FALSE) AS oferece_experimental,o.valor_visita,o.valor_experimental,COALESCE(o.condicoes,'') AS condicoes,
    l.latitude AS lat,l.longitude AS lng,l.rua,l.numero,l.estado,o.atualizado_em AS oferta_atualizada_em,
    COALESCE((SELECT json_agg(foto_url ORDER BY id) FROM fotos_academia WHERE academia_id=pa.id),'[]') AS fotos,
    (SELECT row_to_json(e) FROM estrutura_academia e WHERE e.academia_id=u.id) AS estrutura,
    COALESCE((SELECT json_agg(json_build_object('nome',p.nome,'valor',p.valor,'duracao_meses',p.duracao_meses,'servicos',p.servicos,'modalidades',p.modalidades,'condicoes',p.condicoes) ORDER BY p.nome) FROM planos_comerciais p WHERE p.academia_id=u.id AND p.ativo),'[]') AS planos_comerciais
    FROM usuarios u LEFT JOIN perfis_personal pp ON pp.usuario_id=u.id AND u.tipo_usuario='personal'
    LEFT JOIN perfis_nutri pn ON pn.usuario_id=u.id AND u.tipo_usuario='nutri'
    LEFT JOIN perfis_academia pa ON pa.usuario_id=u.id AND u.tipo_usuario='academia'
    LEFT JOIN localizacoes_servicos l ON l.usuario_id=u.id LEFT JOIN ofertas_servicos o ON o.usuario_id=u.id
    WHERE u.tipo_usuario IN ('personal','nutri','academia') ORDER BY nome,u.id`);
  return r.rows;
}
export function filtrarServicos(lista,q){
  const periodo=q.periodo||'mensal';if(!['diaria','semanal','mensal','anual'].includes(periodo))throw falha('Período de preço inválido.');
  const max=q.preco_max==null||q.preco_max===''?null:Number(q.preco_max);if(max!==null&&(!Number.isFinite(max)||max<0||max>1000000))throw falha('Preço máximo inválido.');
  const dia=q.dia==null||q.dia===''?null:Number(q.dia);if(dia!==null&&(!Number.isInteger(dia)||dia<0||dia>6))throw falha('Dia inválido.');
  if(q.horario&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.horario)||dia===null))throw falha('Escolha um dia para filtrar pelo horário.');
  return lista.filter(s=>(!q.cidade||normalizar(s.cidade).includes(normalizar(q.cidade)))&&(!q.tipo||q.tipo==='todos'||q.tipo===s.tipo)&&
    (!q.busca||normalizar([s.nome,s.descricao,...(s.servicos||[]),...s.especialidades,...s.objetivos,...s.modalidades].join(' ')).includes(normalizar(q.busca)))&&
    ['especialidade','objetivo','modalidade'].every((k,i)=>!q[k]||s[['especialidades','objetivos','modalidades'][i]].some(v=>normalizar(v)===normalizar(q[k])))&&
    (!q.atendimento||s.atendimento.includes(q.atendimento))&&(q.novos!=='true'||s.aceita_novos===true)&&
    (max===null||(s[`preco_${periodo}`]!=null&&Number(s[`preco_${periodo}`])<=max))&&
    (dia===null||s.disponibilidade.some(d=>d.dia===dia&&(!q.horario||d.inicio<=q.horario&&d.fim>q.horario))));
}
export function validarInteresse(b={}){
 if(!b||typeof b!=='object'||Array.isArray(b))throw falha('Apresentação inválida.');
 const objetivo=texto(b.objetivo,1000),disponibilidade=b.disponibilidade||[];
 if(!Array.isArray(disponibilidade)||disponibilidade.length>21)throw falha('Use até 21 faixas de disponibilidade.');
 const hora=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 const faixas=disponibilidade.map(d=>{if(!d||!Number.isInteger(d.dia)||d.dia<0||d.dia>6||!hora(d.inicio)||!hora(d.fim)||d.inicio>=d.fim)throw falha('Disponibilidade inválida.');return {dia:d.dia,inicio:d.inicio,fim:d.fim};}).sort((a,b)=>a.dia-b.dia||a.inicio.localeCompare(b.inicio));
 if(faixas.some((d,i)=>i&&d.dia===faixas[i-1].dia&&d.inicio<faixas[i-1].fim))throw falha('Horários sobrepostos.');return {objetivo,disponibilidade:faixas};
}
export async function solicitarConexao(db,aluno,b,cliente=null){
  if(!['personal','nutricionista'].includes(b.tipo)||!id(b.profissional_id))throw falha('Profissional inválido.');
  const t=b.tipo==='personal'?'conexoes_alunos':'conexoes_nutri',col=b.tipo==='personal'?'personal_id':'nutri_id',principal=b.tipo==='personal'?'permite_treinos':'permite_dietas',interesse=validarInteresse(b.interesse),c=cliente||await db.connect();
  try{if(!cliente)await c.query('BEGIN');await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[aluno]);const prof=await c.query('SELECT id FROM usuarios WHERE id=$1 AND tipo_usuario=$2',[b.profissional_id,b.tipo==='personal'?'personal':'nutri']);if(!prof.rows.length)throw falha('Profissional não encontrado.',404);
    const anterior=(await c.query(`SELECT * FROM ${t} WHERE aluno_id=$1 AND ${col}=$2 FOR UPDATE`,[aluno,b.profissional_id])).rows[0];
    if(anterior&&['pendente','aceito'].includes(anterior.status)){if(!cliente)await c.query('COMMIT');return {...anterior,existente:true};}
    const r=anterior?await c.query(`UPDATE ${t} SET status='pendente',ativo=TRUE,${b.tipo==='nutricionista'?'permite_diario=FALSE,permite_fotos_refeicoes=FALSE,':''}${principal}=FALSE,permite_medidas=FALSE,permite_fotos=FALSE,permite_metas=FALSE,encerrado_em=NULL,ciclo=ciclo+1,criado_em=NOW(),interesse=$2 WHERE id=$1 RETURNING *`,[anterior.id,interesse]):await c.query(`INSERT INTO ${t}(aluno_id,${col},status,ativo,${principal},permite_medidas,permite_fotos,permite_metas,interesse) VALUES($1,$2,'pendente',TRUE,FALSE,FALSE,FALSE,FALSE,$3) RETURNING *`,[aluno,b.profissional_id,interesse]);
    if(!cliente)await c.query('COMMIT');return {...r.rows[0],interesse,existente:false};
  }catch(e){if(!cliente)await c.query('ROLLBACK');throw e;}finally{if(!cliente)c.release();}
}
export async function encerrarConexao(db,aluno,tipo,conexao){
  if(!['personal','nutricionista'].includes(tipo)||!id(conexao))throw falha('Conexão inválida.');const t=tipo==='personal'?'conexoes_alunos':'conexoes_nutri',principal=tipo==='personal'?'permite_treinos':'permite_dietas';
  const r=await db.query(`UPDATE ${t} SET status='cancelado',ativo=FALSE,${tipo==='nutricionista'?'permite_diario=FALSE,permite_fotos_refeicoes=FALSE,':''}${principal}=FALSE,permite_medidas=FALSE,permite_fotos=FALSE,permite_metas=FALSE,encerrado_em=COALESCE(encerrado_em,NOW()) WHERE id=$1 AND aluno_id=$2 RETURNING id`,[conexao,aluno]);if(!r.rows.length)throw falha('Conexão não encontrada.',404);return {message:'Conexão encerrada. Acesso revogado e histórico preservado.'};
}
export function rotasBusca(db){
  const r=Router();r.use((_q,s,n)=>{s.set('Cache-Control','no-store');n();});
  const rota=f=>async(q,s)=>{try{await f(q,s);}catch(e){if(!e.status&&e.code!=='23505')console.error('Busca e conexões:',e.message);s.status(e.status||(e.code==='23505'?409:500)).json({message:e.status?e.message:e.code==='23505'?'Já existe uma solicitação aberta. Consulte suas solicitações.':'Não foi possível completar a operação.'});}};
  const aluno=(q,s,n)=>q.usuario.tipo_usuario==='aluno'?n():s.status(403).json({message:'Disponível para alunos.'});
  const prestador=(q,s,n)=>['personal','nutri','academia'].includes(q.usuario.tipo_usuario)?n():s.status(403).json({message:'Disponível para prestadores.'});
  r.get('/catalogo',aluno,rota(async(q,s)=>{const lista=await catalogoServicos(db);s.json({servicos:filtrarServicos(lista,q.query),filtros:Object.fromEntries(['especialidades','objetivos','modalidades'].map(k=>[k,[...new Set(lista.flatMap(s=>s[k]))].sort((a,b)=>a.localeCompare(b,'pt-BR'))]))});}));
  r.get('/perfil/:tipo/:id',aluno,rota(async(q,s)=>{const p=(await catalogoServicos(db)).find(p=>p.tipo===q.params.tipo&&p.id===q.params.id);if(!p)throw falha('Perfil não encontrado.',404);await db.query('INSERT INTO visitas_perfil(perfil_usuario_id,visitante_id) VALUES($1,$2)',[p.id,q.usuario.id]);s.json(p);}));
  r.get('/oferta',prestador,rota(async(q,s)=>{const o=(await db.query('SELECT * FROM ofertas_servicos WHERE usuario_id=$1',[q.usuario.id])).rows[0];if(o)return s.json(o);const p=(await catalogoServicos(db)).find(p=>p.id===String(q.usuario.id));s.json({versao:0,servicos:[],especialidades:[],objetivos:[],modalidades:p?.modalidades||[],atendimento:[],disponibilidade:[],aceita_novos:null,recebe_visitas:false,oferece_experimental:false,valor_visita:null,valor_experimental:null,condicoes:''});}));
  r.put('/oferta',prestador,rota(async(q,s)=>{const o=validarOferta(q.body,q.usuario.tipo_usuario);if(!Number.isInteger(q.body.versao)||q.body.versao<0)throw falha('Recarregue os dados antes de salvar.',409);
    const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.usuario.id]);const anterior=(await c.query('SELECT versao FROM ofertas_servicos WHERE usuario_id=$1',[q.usuario.id])).rows[0];if((anterior?.versao||0)!==q.body.versao)throw falha('Informações atualizadas em outra tela. Recarregue.',409);
      const result=await c.query(`INSERT INTO ofertas_servicos(usuario_id,especialidades,objetivos,modalidades,atendimento,disponibilidade,aceita_novos,recebe_visitas,oferece_experimental,valor_visita,valor_experimental,condicoes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(usuario_id) DO UPDATE SET especialidades=$2,objetivos=$3,modalidades=$4,atendimento=$5,disponibilidade=$6,aceita_novos=$7,recebe_visitas=$8,oferece_experimental=$9,valor_visita=$10,valor_experimental=$11,condicoes=$12,versao=ofertas_servicos.versao+1,atualizado_em=NOW() RETURNING *`,[q.usuario.id,...['especialidades','objetivos','modalidades','atendimento','disponibilidade'].map(k=>JSON.stringify(o[k])),o.aceita_novos,o.recebe_visitas,o.oferece_experimental,o.valor_visita,o.valor_experimental,o.condicoes]);await c.query('UPDATE ofertas_servicos SET servicos=$1 WHERE usuario_id=$2',[JSON.stringify(o.servicos),q.usuario.id]);await c.query('COMMIT');s.json({...result.rows[0],servicos:o.servicos});
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  r.get('/conexoes/historico',rota(async(q,s)=>{const offset=Number(q.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw falha('Página inválida.');if(!['aluno','personal','nutri'].includes(q.usuario.tipo_usuario))throw falha('Perfil sem acesso.',403);const campo=q.usuario.tipo_usuario==='aluno'?'h.aluno_id':'h.profissional_id';const result=await db.query(`SELECT h.*,u.nome AS aluno_nome FROM historico_conexoes h JOIN usuarios u ON u.id=h.aluno_id WHERE ${campo}=$1 AND ($3::boolean=FALSE OR h.evento IN ('cancelado','desativado')) ORDER BY h.criado_em DESC,h.id DESC LIMIT 21 OFFSET $2`,[q.usuario.id,offset,q.query.encerrados==='true']);s.json({eventos:result.rows.slice(0,20),tem_mais:result.rows.length>20});}));
  r.get('/visitas',rota(async(q,s)=>{if(!['aluno','academia'].includes(q.usuario.tipo_usuario))throw falha('Perfil sem acesso.',403);const offset=Number(q.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw falha('Página inválida.');const campo=q.usuario.tipo_usuario==='aluno'?'s.aluno_id':'s.academia_id';const result=await db.query(`SELECT s.*,s.data::text,u.nome AS aluno_nome,a.nome AS academia_nome,
      COALESCE((SELECT json_agg(h ORDER BY h.id) FROM historico_visitas h WHERE h.solicitacao_id=s.id),'[]') AS historico
      FROM solicitacoes_academia s JOIN usuarios u ON u.id=s.aluno_id JOIN usuarios a ON a.id=s.academia_id WHERE ${campo}=$1 ORDER BY s.criada_em DESC,s.id DESC LIMIT 21 OFFSET $2`,[q.usuario.id,offset]);s.json({solicitacoes:result.rows.slice(0,20),tem_mais:result.rows.length>20});}));
  r.post('/visitas',aluno,rota(async(q,s)=>{
    const b=q.body;if(!id(b.academia_id)||!uuid(b.chave_cliente)||!['visita','experimental'].includes(b.tipo)||!dataValida(b.data,true)||b.data<hojeEvolucao()||Date.parse(b.data)-Date.parse(hojeEvolucao())>90*86400000||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.horario||''))throw falha('Escolha tipo, data e horário nos próximos 90 dias.');
    const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.usuario.id]);const existente=(await c.query('SELECT *,data::text FROM solicitacoes_academia WHERE aluno_id=$1 AND chave_cliente=$2',[q.usuario.id,b.chave_cliente])).rows[0];if(existente){await c.query('COMMIT');return s.json(existente);}
      const p=(await catalogoServicos(c)).find(p=>p.id===String(b.academia_id)&&p.tipo==='academia');if(!p||!(b.tipo==='visita'?p.recebe_visitas:p.oferece_experimental))throw falha('A academia não está recebendo este tipo de solicitação.');
      const futuro=(await c.query("SELECT ($1::date+$2::time)>(NOW() AT TIME ZONE 'America/Sao_Paulo') AS valido",[b.data,b.horario])).rows[0].valido;if(!futuro)throw falha('Escolha um horário futuro, no horário de Brasília.');
      const result=await c.query(`INSERT INTO solicitacoes_academia(aluno_id,academia_id,chave_cliente,tipo,data,horario,observacoes,oferta) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *,data::text`,[q.usuario.id,b.academia_id,b.chave_cliente,b.tipo,b.data,b.horario,texto(b.observacoes,1000),JSON.stringify({nome:p.nome,tipo:b.tipo,valor:b.tipo==='visita'?p.valor_visita:p.valor_experimental,condicoes:p.condicoes,cidade:p.cidade,rua:p.rua,numero:p.numero})]);await c.query("INSERT INTO historico_visitas(solicitacao_id,status) VALUES($1,'pendente')",[result.rows[0].id]);await c.query('COMMIT');s.status(201).json(result.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  r.patch('/visitas/:id',rota(async(q,s)=>{
    if(!['aluno','academia'].includes(q.usuario.tipo_usuario)||!id(q.params.id)||!Number.isInteger(q.body.versao))throw falha('Solicitação inválida.');const c=await db.connect();
    try{await c.query('BEGIN');const campo=q.usuario.tipo_usuario==='aluno'?'aluno_id':'academia_id',result=await c.query(`SELECT *,data::text FROM solicitacoes_academia WHERE id=$1 AND ${campo}=$2 FOR UPDATE`,[q.params.id,q.usuario.id]);const atual=result.rows[0];if(!atual)throw falha('Solicitação não encontrada.',404);if(atual.versao!==q.body.versao)throw falha('Solicitação atualizada. Recarregue.',409);
      const destino=q.body.status,permitidos=q.usuario.tipo_usuario==='aluno'?(['pendente','confirmada'].includes(atual.status)?['cancelada']:[]):atual.status==='pendente'?['confirmada','recusada']:atual.status==='confirmada'?['cancelada','realizada','nao_compareceu']:[];
      if(!permitidos.includes(destino))throw falha('Esta alteração de situação não é permitida.',409);
      const futuro=(await c.query("SELECT ($1::date+$2::time)>(NOW() AT TIME ZONE 'America/Sao_Paulo') AS futuro",[atual.data,atual.horario])).rows[0].futuro;
      if(destino==='confirmada'&&!futuro)throw falha('O horário solicitado já passou. Recuse a solicitação com uma orientação.');if(['realizada','nao_compareceu'].includes(destino)&&futuro)throw falha('Registre o resultado após o horário da visita.');
      const resposta=texto(q.body.resposta,2000);if(q.usuario.tipo_usuario==='academia'&&['recusada','cancelada'].includes(destino)&&!resposta)throw falha('Informe o motivo ao aluno.');
      const novo=await c.query('UPDATE solicitacoes_academia SET status=$1,resposta=$2,versao=versao+1,atualizada_em=NOW() WHERE id=$3 RETURNING *,data::text',[destino,resposta,atual.id]);await c.query('INSERT INTO historico_visitas(solicitacao_id,status,resposta) VALUES($1,$2,$3)',[atual.id,destino,resposta]);await c.query('COMMIT');s.json(novo.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  return r;
}
