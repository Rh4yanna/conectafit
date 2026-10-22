import 'dotenv/config';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function start(file, args = []) {
  const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code || 0); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
async function health() {
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/health`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await response.json();
    return data.service === 'conectafit' && response.ok;
  } catch { return false; }
}

if (await health()) {
  console.log('Servidor ConectaFit e PostgreSQL já estão disponíveis.');
} else {
  start('server/server.js');
  let ready = false;
  for (let attempt = 0; attempt < 15 && !stopping; attempt++) {
    if (await health()) { ready = true; break; }
    await delay(500);
  }
  if (!ready) {
    console.error('Não foi possível iniciar o servidor e conectar ao PostgreSQL. Confira a porta e as configurações do banco no .env.');
    stop(1);
  }
}
if (!stopping) start('node_modules/vite/bin/vite.js', process.argv.slice(2));
