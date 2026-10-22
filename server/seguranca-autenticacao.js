import crypto from 'node:crypto';
import {Buffer} from 'node:buffer';
import bcrypt from 'bcryptjs';

export const senhaAceitavel = senha => typeof senha === 'string' && senha.length >= 8 && Buffer.byteLength(senha, 'utf8') <= 72;

// Todas as recuperacoes da mesma conta usam a mesma trava, inclusive na emissao.
export async function redefinirSenha(db, token, senha) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const candidato = (await c.query('SELECT usuario_id FROM recuperacoes_senha WHERE token_hash=$1', [hash])).rows[0];
    if (!candidato) { await c.query('ROLLBACK'); return false; }
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [candidato.usuario_id]);
    const valido = await c.query('SELECT id FROM recuperacoes_senha WHERE token_hash=$1 AND usado_em IS NULL AND expira_em>NOW()', [hash]);
    if (!valido.rows.length) { await c.query('ROLLBACK'); return false; }
    const senhaHash = await bcrypt.hash(senha, 12);
    await c.query('UPDATE usuarios SET senha_hash=$1,versao_sessao=versao_sessao+1 WHERE id=$2', [senhaHash, candidato.usuario_id]);
    await c.query('UPDATE recuperacoes_senha SET usado_em=NOW() WHERE usuario_id=$1 AND usado_em IS NULL', [candidato.usuario_id]);
    await c.query('COMMIT');
    return true;
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
}

export async function emitirRecuperacao(db, usuarioId, tokenHash) {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE', [usuarioId]);
    await c.query("INSERT INTO recuperacoes_senha(usuario_id,token_hash,expira_em) VALUES($1,$2,NOW()+INTERVAL '30 minutes')", [usuarioId, tokenHash]);
    await c.query('COMMIT');
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
}
