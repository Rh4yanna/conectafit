import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.clock.install();
  await page.route('**/api/login', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Credenciais incorretas.' }) }));
  await page.goto(process.env.LANDING_URL || 'http://127.0.0.1:5187/login');
  await page.locator('[name=email]').fill('teste@example.invalid');
  await page.locator('[name=senha]').fill('SenhaDeTeste!');
  await page.locator('button[type=submit]').click();
  const erro = page.getByRole('alert');
  await expect(erro).toContainText('Credenciais incorretas.');
  await page.clock.runFor(4900);
  await expect(erro).toBeVisible();
  await page.clock.runFor(200);
  await expect(erro).toHaveCount(0);
  await expect(page.locator('[name=email]')).toHaveValue('teste@example.invalid');
  await expect(page.locator('[name=senha]')).toHaveValue('SenhaDeTeste!');
  await page.locator('button[type=submit]').click();
  await expect(erro).toBeVisible();
  await page.clock.runFor(5100);
  await expect(erro).toHaveCount(0);

  const emitir = (tipo, texto) => page.evaluate(({ tipo, texto }) => window.dispatchEvent(new CustomEvent('conectafit-feedback', { detail: { tipo, texto } })), { tipo, texto });
  const aviso = page.getByLabel('Resultado da operação');
  await emitir('sucesso', 'Primeira operação salva.');
  await expect(aviso).toBeVisible();
  await page.clock.runFor(4000);
  await emitir('erro', 'Segunda operação não concluída.');
  await expect(aviso).toContainText('Segunda operação');
  await page.clock.runFor(4000);
  await expect(aviso).toBeVisible();
  await page.clock.runFor(1100);
  await expect(aviso).toHaveCount(0);
  await emitir('sucesso', 'Salvo.');
  await page.getByRole('button', { name: 'Fechar mensagem da operação' }).click();
  await expect(aviso).toHaveCount(0);
  console.log('OK: five-second local/global messages, new-message timer reset, repeated error, preserved fields and manual dismissal.');
} finally {
  await browser.close();
}
