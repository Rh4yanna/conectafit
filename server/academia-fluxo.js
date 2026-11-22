import {motivoBloqueio} from './academia-regras.js';
import {Router} from 'express';
import {rota,erro,tx,matricula,ativa,data,auditar,permitir,texto} from './academia-core.js';
export function rotasFluxoAcademia(db){
 const r=Router();
 r.use('/fluxo',rota(async(q,s,n)=>{permitir(q,'gestor','recepcao');n();}));
 r.get('/fluxo',rota(async(q,s)=>{
  const inicio=data(q.query.inicio),fim=data(q.query.fim),offset=Number(q.query.offset||0);
  if(fim<inicio||Date.parse(fim)-Date.parse(inicio)>366*86400000||!Number.isSafeInteger(offset)||offset<0)throw erro('Confira o período (até um ano) e a página.');
  const filtro="a.academia_id=$1 AND a.entrada>=($2::date AT TIME ZONE 'America/Sao_Paulo') AND a.entrada<(($3::date+interval '1 day') AT TIME ZONE 'America/Sao_Paulo')";
  const valores=[q.unidade,inicio,fim];
  const busca=texto(q.query.busca,120),situacao=q.query.situacao||'',ordem=q.query.ordem||'recente';if(!['','aberto','fechado'].includes(situacao)||!['recente','antigo','nome'].includes(ordem))throw erro('Filtro inválido.');const ordemSQL={recente:'a.entrada DESC,a.id DESC',antigo:'a.entrada ASC,a.id ASC',nome:'m.aluno_nome ASC,a.id DESC'}[ordem];
  const [presentes,historico,resumo,horarios,diario,hoje,negados,quantidade]=await Promise.all([
   db.query('SELECT a.*,m.aluno_nome FROM acessos_academia a JOIN matriculas_academia m ON m.id=a.matricula_id WHERE a.academia_id=$1 AND a.saida IS NULL ORDER BY a.entrada',[q.unidade]),
   db.query(`SELECT a.*,m.aluno_nome,u.nome AS registrado_por,v.nome AS saida_por FROM acessos_academia a JOIN matriculas_academia m ON m.id=a.matricula_id JOIN usuarios u ON u.id=a.autor_entrada LEFT JOIN usuarios v ON v.id=a.autor_saida WHERE ${filtro} AND ($5='' OR position(lower($5) in lower(m.aluno_nome))>0 OR m.id::text=$5) AND ($6='' OR ($6='aberto' AND a.saida IS NULL) OR ($6='fechado' AND a.saida IS NOT NULL)) ORDER BY ${ordemSQL} LIMIT 50 OFFSET $4`,[...valores,offset,busca,situacao]),
   db.query(`SELECT count(*)::int AS entradas,count(DISTINCT matricula_id)::int AS alunos,count(*) FILTER(WHERE saida IS NULL)::int AS abertos,count(*) FILTER(WHERE saida IS NOT NULL)::int AS finalizados FROM acessos_academia a WHERE ${filtro}`,valores),
   db.query(`SELECT extract(hour FROM entrada AT TIME ZONE 'America/Sao_Paulo')::int AS hora,count(*)::int AS entradas FROM acessos_academia a WHERE ${filtro} GROUP BY hora ORDER BY hora`,valores),
   db.query(`SELECT (entrada AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia,count(*)::int AS entradas FROM acessos_academia a WHERE ${filtro} GROUP BY dia ORDER BY dia`,valores),
   db.query("SELECT count(*) FILTER(WHERE (entrada AT TIME ZONE 'America/Sao_Paulo')::date=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS entradas_hoje,count(*) FILTER(WHERE (saida AT TIME ZONE 'America/Sao_Paulo')::date=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS saidas_hoje FROM acessos_academia WHERE academia_id=$1",[q.unidade]),
   db.query("SELECT count(*)::int total FROM tentativas_acesso_academia WHERE academia_id=$1 AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $2 AND $3",valores),
   db.query(`SELECT count(*)::int total FROM acessos_academia a JOIN matriculas_academia m ON m.id=a.matricula_id WHERE ${filtro} AND ($4='' OR position(lower($4) in lower(m.aluno_nome))>0 OR m.id::text=$4) AND ($5='' OR ($5='aberto' AND a.saida IS NULL) OR ($5='fechado' AND a.saida IS NOT NULL))`,[...valores,busca,situacao])
  ]);
  s.json({presentes:presentes.rows,historico:historico.rows,resumo:{...resumo.rows[0],...hoje.rows[0],negados:negados.rows[0].total,total_filtrado:quantidade.rows[0].total},horarios:horarios.rows,diario:diario.rows});
 }));
 r.post('/fluxo/entrada',rota(async(q,s)=>{let resultado;try{resultado=await tx(db,async c=>{
  const m=await matricula(c,q,q.body.matricula_id,true);
  const politica=(await c.query('SELECT regras FROM politicas_acesso_academia WHERE academia_id=$1',[q.unidade])).rows[0]?.regras||{};if(q.papel==='recepcao'&&politica.recepcao_manual===false)throw erro('O registro manual está restrito ao gestor.',403);
  const d=(await c.query("SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia")).rows[0].dia;
  if(!ativa(m,d))throw erro('A matrícula precisa estar ativa e vigente para registrar a entrada.');
  if((await c.query('SELECT id FROM acessos_academia WHERE matricula_id=$1 AND saida IS NULL',[m.id])).rows.length)throw erro('Este aluno já possui uma entrada aberta. Registre a saída antes de uma nova entrada.',409);
  const ciclo=(await c.query('SELECT contrato FROM ciclos_matricula WHERE matricula_id=$1 AND inicio<=$2 AND termino>=$2 ORDER BY inicio DESC LIMIT 1',[m.id,d])).rows[0];
  const momento=(await c.query("SELECT extract(dow FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::int AS dia,to_char(NOW() AT TIME ZONE 'America/Sao_Paulo','HH24:MI') AS hora")).rows[0];
  if(politica.inicio&&(momento.hora<politica.inicio||momento.hora>=politica.fim))throw erro(`A academia permite entradas das ${politica.inicio} às ${politica.fim}.`,409);
  const entradas=Number((await c.query("SELECT count(*) FROM acessos_academia WHERE matricula_id=$1 AND (entrada AT TIME ZONE 'America/Sao_Paulo')::date=$2",[m.id,d])).rows[0].count);
  const bloqueio=motivoBloqueio(ciclo?.contrato?.regras_acesso,momento.dia,momento.hora,entradas);if(bloqueio)throw erro(bloqueio,409);
  const novo=(await c.query('INSERT INTO acessos_academia(academia_id,matricula_id,autor_entrada) VALUES($1,$2,$3) RETURNING *',[q.unidade,m.id,q.usuario.id])).rows[0];
  const presenca=(await c.query('INSERT INTO presencas_academia(academia_id,matricula_id,data,autor_id) VALUES($1,$2,$3,$4) ON CONFLICT(matricula_id,data) DO UPDATE SET cancelada=false,autor_id=$4 WHERE presencas_academia.cancelada RETURNING *',[q.unidade,m.id,d,q.usuario.id])).rows[0];
  if(presenca)await auditar(c,q,'presenca',presenca.id,'registrar','Presença registrada pela entrada',null,presenca);
  await auditar(c,q,'acesso',novo.id,'entrada','Entrada registrada pela equipe',null,novo);return novo;
 });}catch(e){if([403,409].includes(e.status)||e.message==='A matrícula precisa estar ativa e vigente para registrar a entrada.')await db.query('INSERT INTO tentativas_acesso_academia(academia_id,matricula_id,autor_id,motivo) SELECT $1,id,$3,$4 FROM matriculas_academia WHERE academia_id=$1 AND id=$2',[q.unidade,q.body.matricula_id,q.usuario.id,e.message]);throw e;}s.status(201).json(resultado);}));
 r.post('/fluxo/:id/saida',rota(async(q,s)=>{s.json(await tx(db,async c=>{
  const politica=(await c.query('SELECT regras FROM politicas_acesso_academia WHERE academia_id=$1',[q.unidade])).rows[0]?.regras||{};if(q.papel==='recepcao'&&politica.recepcao_manual===false)throw erro('O registro manual está restrito ao gestor.',403);
  const antes=(await c.query('SELECT * FROM acessos_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[q.params.id,q.unidade])).rows[0];
  if(!antes)throw erro('Entrada não encontrada.',404);if(antes.saida)return antes;
  const novo=(await c.query('UPDATE acessos_academia SET saida=clock_timestamp(),autor_saida=$2 WHERE id=$1 RETURNING *',[antes.id,q.usuario.id])).rows[0];
  await auditar(c,q,'acesso',novo.id,'saida','Saída registrada pela equipe',antes,novo);return novo;
 }));}));
 r.get('/fluxo/configuracoes',rota(async(q,s)=>{permitir(q,'gestor');const [equipamentos,politica]=await Promise.all([db.query('SELECT * FROM equipamentos_acesso_academia WHERE academia_id=$1 ORDER BY nome,id',[q.unidade]),db.query('SELECT regras FROM politicas_acesso_academia WHERE academia_id=$1',[q.unidade])]);s.json({equipamentos:equipamentos.rows,politica:politica.rows[0]?.regras||{},integracao:'Nenhum equipamento conectado. Integração com fabricante não configurada.'});}));
 r.put('/fluxo/politica',rota(async(q,s)=>{permitir(q,'gestor');const inicio=texto(q.body.inicio,5),fim=texto(q.body.fim,5);if(Boolean(inicio)!==Boolean(fim)||inicio&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(fim)||inicio>=fim))throw erro('Informe horários válidos no mesmo dia.');if(typeof q.body.recepcao_manual!=='boolean')throw erro('Informe quem pode registrar acessos.');const regras={inicio,fim,recepcao_manual:q.body.recepcao_manual};s.json(await tx(db,async c=>{const antes=(await c.query('SELECT regras FROM politicas_acesso_academia WHERE academia_id=$1 FOR UPDATE',[q.unidade])).rows[0]?.regras||{};await c.query('INSERT INTO politicas_acesso_academia(academia_id,regras) VALUES($1,$2) ON CONFLICT(academia_id) DO UPDATE SET regras=$2,atualizado_em=NOW()',[q.unidade,regras]);await auditar(c,q,'politica_acesso',q.unidade,'salvar','Política de acesso atualizada',antes,regras);return regras;}));}));
 r.post('/fluxo/equipamentos',rota(async(q,s)=>{permitir(q,'gestor');const b=q.body,nome=texto(b.nome,120,true),identificacao=texto(b.identificacao,120,true),fabricante=texto(b.fabricante,120),modelo=texto(b.modelo,120),localizacao=texto(b.localizacao,150);if(typeof b.ativo!=='boolean')throw erro('Informe a situação do equipamento.');s.json(await tx(db,async c=>{let antes;if(b.id){antes=(await c.query('SELECT * FROM equipamentos_acesso_academia WHERE academia_id=$1 AND id=$2 FOR UPDATE',[q.unidade,b.id])).rows[0];if(!antes)throw erro('Equipamento não encontrado.',404);}const novo=antes?(await c.query('UPDATE equipamentos_acesso_academia SET nome=$3,identificacao=$4,fabricante=$5,modelo=$6,localizacao=$7,ativo=$8,atualizado_em=NOW() WHERE academia_id=$1 AND id=$2 RETURNING *',[q.unidade,b.id,nome,identificacao,fabricante,modelo,localizacao,b.ativo])).rows[0]:(await c.query('INSERT INTO equipamentos_acesso_academia(academia_id,nome,identificacao,fabricante,modelo,localizacao,ativo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[q.unidade,nome,identificacao,fabricante,modelo,localizacao,b.ativo])).rows[0];await auditar(c,q,'equipamento_acesso',novo.id,antes?'editar':'criar','Cadastro de equipamento',antes,novo);return novo;}));}));
 return r;
}
