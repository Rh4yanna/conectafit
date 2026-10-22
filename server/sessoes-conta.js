import crypto from 'node:crypto';

export const hashSessao = token => crypto.createHash('sha256').update(token).digest('hex');
export const nomeCookie = producao => producao ? '__Host-conectafit' : 'conectafit_sessao';
const opcoesCookie = producao => ({httpOnly:true,secure:producao,sameSite:'lax',path:'/'});
export function cookieSessao(req, producao) {
  const prefixo=nomeCookie(producao)+'=';
  const valor=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(prefixo))?.slice(prefixo.length);
  return /^[a-f0-9]{64}$/.test(valor||'') ? valor : null;
}
export function tokenSessao(req, producao) {
  // Cookie tem precedencia. JWTs antigos nao sao aceitos.
  const cookie=cookieSessao(req,producao);
  if(cookie)return cookie;
  const bearer=req.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/);
  return bearer?.[1]||null;
}
export function limparCookie(res, producao) { res.clearCookie(nomeCookie(producao),opcoesCookie(producao)); }
export async function criarSessao(db, usuario, req, res, producao) {
  const token=crypto.randomBytes(32).toString('hex');
  const c=await db.connect();
  try {
    await c.query('BEGIN');
    const atual=(await c.query('SELECT versao_sessao FROM usuarios WHERE id=$1 FOR UPDATE',[usuario.id])).rows[0];
    if(!atual||atual.versao_sessao!==usuario.versao_sessao)throw new Error('Credenciais alteradas durante o login.');
    const anterior=cookieSessao(req,producao);
    if(anterior)await c.query('UPDATE sessoes_conta SET revogada_em=NOW() WHERE token_hash=$1 AND revogada_em IS NULL',[hashSessao(anterior)]);
    await c.query('DELETE FROM sessoes_conta WHERE usuario_id=$1 AND (expira_em<=NOW() OR revogada_em IS NOT NULL)',[usuario.id]);
    await c.query("INSERT INTO sessoes_conta(token_hash,usuario_id,versao_sessao,expira_em) VALUES($1,$2,$3,NOW()+INTERVAL '8 hours')",[hashSessao(token),usuario.id,atual.versao_sessao]);
    await c.query('COMMIT');
    res.cookie(nomeCookie(producao),token,{...opcoesCookie(producao),maxAge:8*60*60*1000});
  } catch(e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
export function protegerCsrf(origens, producao) {
  return (req,res,next)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
    const origem=req.get('origin');
    if(origem&&!origens.includes(origem))return res.status(403).json({message:'Origem da solicitação não autorizada.'});
    // Formulario externo nao consegue adicionar este header. CORS libera apenas origens explicitas.
    const bearer=!cookieSessao(req,producao)&&/^Bearer [a-f0-9]{64}$/.test(req.get('authorization')||'');
    if(!bearer&&req.get('X-ConectaFit-Request')!=='1')return res.status(403).json({message:'Solicitação sem proteção de origem. Recarregue a página.'});
    next();
  };
}
