import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export async function aplicarMigracoes(db, {log = console.log} = {}) {
 const c = await db.connect();
 try {
  await c.query("SELECT pg_advisory_lock(hashtext(current_database() || current_schema() || 'conectafit-migrations'))");
  await c.query('CREATE TABLE IF NOT EXISTS migrations_conectafit(nome TEXT PRIMARY KEY, executada_em TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const dir = fileURLToPath(new URL('./migrations/', import.meta.url));
  for (const nome of (await fs.readdir(dir)).filter(n=>n.endsWith('.sql')).sort()) {
   if ((await c.query('SELECT 1 FROM migrations_conectafit WHERE nome=$1',[nome])).rowCount) continue;
   const sql = (await fs.readFile(`${dir}/${nome}`,'utf8')).replace(/^\s*BEGIN;\s*/i,'').replace(/\s*COMMIT;\s*$/i,'');
   await c.query('BEGIN');
   try {
    await c.query(sql);
    await c.query('INSERT INTO migrations_conectafit(nome) VALUES($1)',[nome]);
    await c.query('COMMIT');
    log(`aplicada: ${nome}`);
   } catch(e) {await c.query('ROLLBACK'); throw new Error(`Migração ${nome} falhou (${e.code || 'erro'}).`,{cause:e});}
  }
 } finally {
  await c.query('SELECT pg_advisory_unlock_all()').catch(()=>{});
  c.release();
 }
}
