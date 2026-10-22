import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { servidorIsolado } from './teste-servidor-isolado.mjs';

const app = await servidorIsolado();
let browser, vite;
try {
  const senha = 'SenhaSegura!2026', hash = await bcrypt.hash(senha, 12);
  const perfis = [['aluno', 'Aluno', 390], ['personal', 'Personal', 768], ['nutri', 'Nutricionista', 1440], ['academia', 'Academia', 320]];
  for (const [i, [perfil]] of perfis.entries()) await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,$4,$5)`, [i + 1, `Pessoa ${perfil}`, `${perfil}@example.invalid`, hash, perfil]);
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], { env: { ...process.env, PORT: new URL(app.base).port }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let log = ''; vite.stdout.on('data', d => { log += d; }); vite.stderr.on('data', d => { log += d; });
  const front = 'http://127.0.0.1:5187'; let pronto = false;
  for (let i = 0; i < 100; i++) { if (vite.exitCode !== null) throw new Error(log); try { if ((await fetch(front + '/api/health')).ok) { pronto = true; break; } } catch { /* starting */ } await new Promise(r => setTimeout(r, 100)); }
  assert.ok(pronto); browser = await chromium.launch();
  await mkdir('test-results/abertura', { recursive: true });
  for (const [perfil, label, width] of perfis) {
    const ctx = await browser.newContext({ viewport: { width, height: 850 } }), page = await ctx.newPage();
    const erros = []; page.on('pageerror', e => erros.push(e.message));
    let logins = 0, resumoIniciado = false;
    page.on('request', r => { if (r.url().endsWith('/api/login')) logins++; if (/\/api\/(aluno\/resumo|profissional\/dashboard|operacao-academia\/contexto)/.test(r.url())) resumoIniciado = true; });
    await page.goto(front + '/login');
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.locator('[name=email]').fill(`${perfil}@example.invalid`);
    await page.locator('[name=senha]').fill(senha);
    let liberar;
    const bloqueio = new Promise(r => { liberar = r; });
    if (perfil === 'aluno') await page.route('**/api/aluno/resumo', async route => { await bloqueio; await route.continue(); });
    await page.locator('button[type=submit]').click();
    const abertura = page.getByRole('dialog', { name: 'ConectaFit' });
    await expect(abertura).toBeVisible(); const inicio = Date.now();
    await expect(page).toHaveURL(`${front}/${perfil}/dashboard`);
    await expect(page.locator('.app-visual')).toBeHidden();
    assert.ok(await page.locator('.abertura-app').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(0, 0, 0)'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await expect.poll(() => resumoIniciado).toBeTruthy();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.app-visual').evaluate(el => el.contains(document.activeElement)), false);
    await page.screenshot({ path: `test-results/abertura/${perfil}.png` });
    if (perfil === 'aluno') {
      await expect(page.locator('#abertura-status')).toHaveText('Carregando seu espaço…', { timeout: 5000 });
      await expect(page.locator('.app-visual')).toBeHidden();
      liberar();
    }
    await expect(abertura).toHaveCount(0, { timeout: 12000 });
    assert.ok(Date.now() - inicio >= 2500, 'Normal opening lasts approximately three seconds');
    await expect(page.locator('.app-visual')).toBeVisible();
    assert.equal(logins, 1);
    assert.ok((await ctx.cookies()).find(c => c.name === 'conectafit_sessao')?.httpOnly);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    await page.reload();
    await expect(page.locator('.app-visual')).toBeVisible();
    await expect(abertura).toHaveCount(0);
    assert.deepEqual(erros, []);
    await ctx.close();
    console.log(`OK ${perfil}: real authentication, data loading, duration, viewport ${width}, no repeat on reload`);
  }
  // Respect the real server's four-logins-per-30-seconds rate limit.
  console.log('Waiting for the real login rate-limit window before additional scenarios.');
  await new Promise(resolve => setTimeout(resolve, 31000));
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }), page = await ctx.newPage();
  await page.goto(front + '/login');
  await page.locator('[name=email]').fill('aluno@example.invalid');
  await page.locator('[name=senha]').fill('Incorreta!2026');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.pagina-login [role=alert]')).toBeVisible();
  await expect(page.locator('.abertura-app')).toHaveCount(0);
  await page.locator('[name=senha]').fill(senha);
  let confirmar;
  const liberacao = new Promise(r => { confirmar = r; });
  await page.route('**/api/login', async route => { await liberacao; await route.continue(); });
  await page.locator('button[type=submit]').click();
  await expect(page.locator('button[type=submit]')).toBeDisabled();
  await expect(page.locator('.abertura-app')).toHaveCount(0);
  let concluirDados;
  const dadosLiberados = new Promise(resolve => { concluirDados = resolve; });
  await page.route('**/api/aluno/resumo', async route => {
    await dadosLiberados;
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  confirmar();
  await expect(page.locator('.abertura-app')).toBeVisible(); const inicio = Date.now();
  assert.equal(await page.locator('.abertura-progresso span').evaluate(el => getComputedStyle(el).animationName), 'none');
  concluirDados();
  await expect(page.locator('.abertura-app')).toHaveCount(0);
  assert.ok(Date.now() - inicio < 2500, 'Reduced motion skips the three-second wait');
  await expect(page.locator('.app-visual [role=alert]').first()).toBeVisible();
  await page.goto(front + '/aluno/treinos');
  await expect(page.locator('.app-visual')).toBeVisible();
  await expect(page.locator('.abertura-app')).toHaveCount(0);
  await ctx.close();
  console.log('OK failed/pending login, reduced motion, failed data request, navigation without replay');
} finally {
  await browser?.close();
  if (vite && vite.exitCode === null) { const saiu = new Promise(r => vite.once('exit', r)); vite.kill(); await saiu; }
  await app.fechar();
}
