export function configuracaoBanco(env) {
 let base;
 if(env.DATABASE_URL){
  let url;try {url=new URL(env.DATABASE_URL);}catch {throw new Error('DATABASE_URL inválida.');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL deve usar PostgreSQL.');
  // Não permitir que sslmode da URL substitua a validação TLS do driver.
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  base={connectionString:url.toString()};
 }else{
  const faltantes=['DB_USER','DB_HOST','DB_NAME','DB_PASSWORD'].filter(k=>!env[k]);
  if(faltantes.length)throw new Error(`Configuração do banco incompleta: ${faltantes.join(', ')}.`);
  base={user:env.DB_USER,host:env.DB_HOST,database:env.DB_NAME,password:env.DB_PASSWORD,port:Number(env.DB_PORT||5432)};
 }
 return {...base,ssl:env.DB_SSL==='true'?{rejectUnauthorized:true,...(env.DB_SSL_CA?{ca:env.DB_SSL_CA.replace(/\\n/g,'\n')}:{})}:false,connectionTimeoutMillis:5000,max:Number(env.DB_POOL_MAX||10),idleTimeoutMillis:30000};
}
