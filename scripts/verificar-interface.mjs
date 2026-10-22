import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
await mkdir('test-results/interface',{recursive:true});
try {
 for(const tema of ['light','dark']) for(const perfil of ['aluno','personal','nutri','academia']) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(t=>localStorage.setItem('tema_conectafit',t),tema);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>{
   const url=route.request().url();
   const data=url.includes('/usuario/me')?{id:999,nome:'Maria Silva',tipo_usuario:perfil}:url.includes('/notificacoes')?{nao_lidas:2,notificacoes:[]}:null;
   return route.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data||{message:'Dados indisponiveis neste teste visual.'})});
  });
  await page.goto(`http://127.0.0.1:5181/${perfil}/dashboard`);
  const header=page.locator('header').first();
  await expect(header.getByRole('button',{name:'Abrir menu'})).toBeVisible();
  await expect(header.getByRole('link',{name:/Notifica/})).toBeVisible();
  if((await header.boundingBox()).y!==0)throw Error('Header is not at top');
  await header.getByRole('button',{name:'Abrir menu'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Overflow '+perfil);
  await expect(header).toHaveCSS('background-color',tema==='light'?'rgb(255, 255, 255)':'rgb(20, 31, 48)');
  await page.screenshot({path:`test-results/interface/${perfil}-${tema}.png`});
  if(errors.length)throw Error(errors.join('\n'));
  await page.close();
 }
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5181/login');await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await page.screenshot({path:'test-results/interface/login.png',fullPage:true});
 console.log('OK: 4 headers, menus, Escape, mobile overflow, notification links and login rendering (mock API).');
} finally {await browser.close();}
