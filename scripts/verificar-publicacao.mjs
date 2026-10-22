import process from 'node:process';
import dotenv from 'dotenv';
import {validarProducao} from '../server/configuracao-producao.js';
dotenv.config({quiet:true});
let falhas=0;
const verificar=(ok,texto)=>{console.log(`${ok?'OK':'PENDENTE'}: ${texto}`);if(!ok)falhas++;};
try{validarProducao({...process.env,NODE_ENV:'production'});verificar(true,'Configuracao de producao, origens e conexao do banco.');}catch(e){verificar(false,e.message);}
// Verificacao somente leitura. Nao imprime enderecos, usuarios nem credenciais do banco.
if(process.argv.includes('--banco')){
  const {default:db}=await import('../server/db.js');
  try{
    const r=(await db.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    verificar(r&&!r.rolsuper&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolbypassrls,'Conta de execucao do banco sem poderes administrativos.');
  }catch{verificar(false,'Nao foi possivel conferir permissoes do banco.');}finally{await db.end();}
}
const alvo=process.argv.find(a=>a.startsWith('--url='))?.slice(6);
if(alvo){
  const u=new URL(alvo);if(u.protocol!=='https:'||u.username||u.password)throw new Error('Use a origem HTTPS publica sem credenciais.');
  for(const caminho of ['/','/api/health']){
    try{
      const r=await fetch(new URL(caminho,u),{redirect:'manual',signal:AbortSignal.timeout(10000)});
      verificar(r.ok,`Resposta publica ${caminho}.`);
      verificar(!!r.headers.get('strict-transport-security'),`HSTS em ${caminho}.`);
      verificar(r.headers.get('x-content-type-options')==='nosniff',`Protecao de tipo de conteudo em ${caminho}.`);
      if(caminho==='/')verificar(!!r.headers.get('content-security-policy'),'CSP no HTML publicado.');
      else verificar(r.headers.get('cache-control')?.includes('no-store'),'API sem armazenamento em cache.');
    }catch{verificar(false,`Nao foi possivel conferir ${caminho}.`);}
  }
}else console.log('NAO VERIFICADO: ambiente publico. Informe --url=https://seu-dominio apos definir a hospedagem.');
process.exitCode=falhas?1:0;
