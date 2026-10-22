export function validarProducao(env) {
  if(env.NODE_ENV!=='production')return;
  const enderecos=(env.FRONTEND_URLS||env.FRONTEND_URL||'').split(',');
  const origemSegura=v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.origin===v&&!u.username&&!u.password&&!u.hostname.includes('*')&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname);}catch{return false;}};
  if(!origemSegura(env.FRONTEND_URL)||enderecos.some(v=>!origemSegura(v.trim())))throw new Error('Producao exige FRONTEND_URL e origens HTTPS explicitas, sem caminho ou curinga.');
  if(!enderecos.map(v=>v.trim()).includes(env.FRONTEND_URL))throw new Error('A origem principal precisa estar entre as origens permitidas.');
  if(env.VITE_API_URL&&env.VITE_API_URL!=='/api'&&env.VITE_API_URL!==env.FRONTEND_URL+'/api')throw new Error('Esta configuracao de publicacao exige site e API na mesma origem.');
  const host=env.DATABASE_URL?new URL(env.DATABASE_URL).hostname:env.DB_HOST;
  if(!['localhost','127.0.0.1','::1'].includes(host)&&env.DB_SSL!=='true')throw new Error('Banco remoto em producao exige DB_SSL=true e certificado valido.');
  if(!['database','firebase'].includes(env.IMAGE_STORAGE))throw new Error('Produção exige IMAGE_STORAGE=database ou firebase.');
  if(env.IMAGE_STORAGE==='firebase'&&!env.FIREBASE_STORAGE_BUCKET)throw new Error('Firebase exige FIREBASE_STORAGE_BUCKET.');
  if(env.DEMO_PASSWORD)throw new Error('Remova DEMO_PASSWORD do ambiente de producao.');
}
