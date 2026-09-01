import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const diretorio = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

try {
  await db.query(`CREATE TABLE IF NOT EXISTS migrations_conectafit (
    nome TEXT PRIMARY KEY,
    executada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const arquivos = (await fs.readdir(diretorio)).filter((nome) => nome.endsWith('.sql')).sort();
  for (const nome of arquivos) {
    const existe = await db.query('SELECT 1 FROM migrations_conectafit WHERE nome=$1', [nome]);
    if (existe.rows.length) { console.log(`já aplicada: ${nome}`); continue; }
    const sql = await fs.readFile(path.join(diretorio, nome), 'utf8');
    await db.query(sql);
    await db.query('INSERT INTO migrations_conectafit(nome) VALUES($1)', [nome]);
    console.log(`aplicada: ${nome}`);
  }
} catch (error) {
  console.error('Falha na migration:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
