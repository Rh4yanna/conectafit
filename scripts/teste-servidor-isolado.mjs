import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import db from '../server/db.js';
// Copia somente a estrutura. Todas as sequências são locais ao schema de teste.
export async function servidorIsolado(){
  const schema=`teste_app_${crypto.randomBytes(8).toString('hex')}`;let processo;
  const fechar=async()=>{if(processo&&processo.exitCode===null){const encerrou=new Promise(r=>processo.once('exit',r));processo.kill();await encerrou;}await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await db.end();};
  try{
    await db.query(`CREATE SCHEMA ${schema}`);
    const tabelas=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    for(const {tablename:t}of tabelas.rows){
      if(!/^[a-z_][a-z0-9_]*$/.test(t))throw new Error('Nome de tabela não suportado no teste.');
      await db.query(`CREATE TABLE ${schema}.${t} (LIKE public.${t} INCLUDING ALL)`);
      const colunas=await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_default LIKE 'nextval%'",[schema,t]);
      for(const {column_name:c}of colunas.rows){const seq=`${schema}.seq_${crypto.randomBytes(6).toString('hex')}`;await db.query(`CREATE SEQUENCE ${seq}`);await db.query(`ALTER TABLE ${schema}.${t} ALTER COLUMN ${c} SET DEFAULT nextval('${seq}')`);}
    }
    // O histórico faz parte do comportamento testado. A função fica restrita ao
    // schema isolado inclusive quando os dados são preparados pela conexão raiz.
    const historico=await db.query("SELECT pg_get_functiondef(p.oid) AS ddl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='registrar_historico_conexao'");
    if(historico.rows.length){
      await db.query(historico.rows[0].ddl.replace('public.registrar_historico_conexao',`${schema}.registrar_historico_conexao`));
      await db.query(`ALTER FUNCTION ${schema}.registrar_historico_conexao() SET search_path TO ${schema}`);
      for(const tabela of ['conexoes_alunos','conexoes_nutri'])await db.query(`CREATE TRIGGER historico_teste AFTER INSERT OR UPDATE ON ${schema}.${tabela} FOR EACH ROW EXECUTE FUNCTION ${schema}.registrar_historico_conexao()`);
    }
    for(const nome of ['vincular_solicitacao_comercial','dados_historico_perfil','registrar_historico_perfil','notificar_rotina','eventos_rotina','encerrar_agenda_vinculo','notificar_gestao_profissional']){
      const r=await db.query("SELECT pg_get_functiondef(p.oid) AS ddl,pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1",[nome]);
      if(r.rows.length){await db.query(r.rows[0].ddl.replace(`public.${nome}`,`${schema}.${nome}`));await db.query(`ALTER FUNCTION ${schema}.${nome}(${r.rows[0].args}) SET search_path TO ${schema}`);}
    }
    if(tabelas.rows.some(t=>t.tablename==='notificacoes')){
      for(const [t,acao]of [['agenda_profissional','INSERT OR UPDATE'],['treinos','INSERT OR UPDATE'],['planos_alimentares','INSERT OR UPDATE'],['duvidas_alimentares','INSERT OR UPDATE'],['comentarios_evolucao','INSERT'],['respostas_checkin','INSERT'],['solicitacoes_academia','UPDATE']])await db.query(`CREATE TRIGGER rotina_teste AFTER ${acao} ON ${schema}.${t} FOR EACH ROW EXECUTE FUNCTION ${schema}.eventos_rotina()`);
      for(const t of ['conexoes_alunos','conexoes_nutri'])await db.query(`CREATE TRIGGER agenda_vinculo_teste AFTER UPDATE ON ${schema}.${t} FOR EACH ROW EXECUTE FUNCTION ${schema}.encerrar_agenda_vinculo()`);
    }
    if(tabelas.rows.some(t=>t.tablename==='historico_perfis'))for(const t of ['usuarios','perfis_personal','perfis_nutri','perfis_academia'])await db.query(`CREATE TRIGGER historico_perfil_teste AFTER INSERT OR UPDATE ON ${schema}.${t} FOR EACH ROW EXECUTE FUNCTION ${schema}.registrar_historico_perfil()`);
    if(tabelas.rows.some(t=>t.tablename==='convites_personal'))for(const [t,acao] of [['conexoes_alunos','INSERT OR UPDATE'],['conexoes_nutri','INSERT OR UPDATE'],['conversas_treino','INSERT'],['duvidas_alimentares','INSERT'],['agenda_profissional','INSERT OR UPDATE']])await db.query(`CREATE TRIGGER gestao_teste AFTER ${acao} ON ${schema}.${t} FOR EACH ROW EXECUTE FUNCTION ${schema}.notificar_gestao_profissional()`);
    await db.query(`CREATE TRIGGER comercial_teste BEFORE INSERT OR UPDATE OF lead_id ON ${schema}.solicitacoes_academia FOR EACH ROW EXECUTE FUNCTION ${schema}.vincular_solicitacao_comercial()`);
    const reserva=net.createServer();await new Promise(r=>reserva.listen(0,'127.0.0.1',r));const port=reserva.address().port;await new Promise(r=>reserva.close(r));
    processo=spawn(process.execPath,['server/server.js'],{cwd:process.cwd(),env:{...process.env,FRONTEND_URLS:'http://127.0.0.1:5187,http://localhost:5173',PORT:String(port),PGOPTIONS:`-c search_path=${schema}`},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let logs='';processo.stdout.on('data',d=>{logs+=d;});processo.stderr.on('data',d=>{logs+=d;});
    const base=`http://127.0.0.1:${port}`;
    for(let i=0;i<300;i++){try{if((await fetch(`${base}/api/health`)).ok)return {base,schema,db,fechar,logs:()=>logs,token:async id=>{
      const token=crypto.randomBytes(32).toString('hex');
      await db.query(`INSERT INTO ${schema}.sessoes_conta(token_hash,usuario_id,versao_sessao,expira_em) SELECT $1,id,versao_sessao,NOW()+INTERVAL '10 minutes' FROM ${schema}.usuarios WHERE id=$2`,[crypto.createHash('sha256').update(token).digest('hex'),id]);
      return token;
    }};}catch{/* inicialização */}if(processo.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,100));}
    throw new Error('Servidor de teste não iniciou. '+logs);
  }catch(e){await fechar();throw e;}
}
