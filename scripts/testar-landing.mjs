import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.LANDING_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch();
const errors = [];
await mkdir('test-results/landing', { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.locator('h1').waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('.landing-card').count(), 5);
    assert.equal(await page.locator('.landing-profile').count(), 4);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    const invalid = await page.locator('.landing a, .landing button').evaluateAll(elements => elements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width < 24 || r.height < 44 || r.left < 0 || r.right > innerWidth;
    }).map(el => el.textContent));
    assert.deepEqual(invalid, [], `Touch targets at ${width}`);
    await page.getByRole('button', { name: 'Baixar app' }).click();
    assert.equal(await page.locator('#landing-app-status').textContent(), 'Em breve na App Store e no Google Play');
    assert.equal(new URL(page.url()).pathname, '/');
    for (const [name, hash] of [['Recursos', '#recursos'], ['Para quem', '#perfis']]) {
      await page.getByRole('link', { name, exact: name !== 'Voltar ao in\u00edcio' }).click();
      assert.equal(new URL(page.url()).hash, hash);
    }
    const links = await page.locator('.landing a[href="/login"]').count();
    assert.equal(links, 3);
    for (let index = 0; index < links; index++) {
      await page.locator('.landing a[href="/login"]').nth(index).click();
      await page.waitForURL('**/login');
      await page.goto(base);
    }
    assert.ok(await page.locator('.landing img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
    assert.ok(await page.locator('.landing-art-label').evaluateAll(elements => elements.every(el => getComputedStyle(el).animationName === 'none')));
    await page.screenshot({ path: `test-results/landing/${width}.png`, fullPage: true });
    console.log(`OK ${width}px: layout, anchors, download, login, reduced motion`);
  }
  await page.goto(base);
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement.tagName === 'A'));
  await page.getByRole('button', { name: 'Baixar app' }).focus();
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#landing-app-status').textContent());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.locator('#perfis').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#perfis [data-reveal]').classList.contains('landing-entered'));
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => { delete window.IntersectionObserver; });
  await fallback.goto(base);
  assert.ok(await fallback.locator('[data-reveal]').evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el).visibility === 'visible')));
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log('OK keyboard, scroll entrances, observer fallback, no page errors');
} finally {
  await browser.close();
}
