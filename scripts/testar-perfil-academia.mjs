import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
const app=await servidorIsolado();let browser;
try{
 await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES(1,'Academia Teste','academia@example.invalid','teste','academia'),(2,'Aluno','aluno@example.invalid','teste','aluno')`);
 const token=await app.token(1),aluno=await app.token(2);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.addInitScript(()=>localStorage.setItem('usuario',JSON.stringify({id:1,nome:'Academia Teste',tipo_usuario:'academia'})));
 await page.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());const r=await fetch(app.base+u.pathname+u.search,{method:req.method(),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(req.postData()?{body:req.postData()}:{})});await route.fulfill({status:r.status,contentType:'application/json',body:await r.text()});});
 await page.goto('http://127.0.0.1:5187/academia/dashboard?aba=perfil');
 await page.getByLabel('Nome da unidade',{exact:true}).fill('Academia Atualizada');
 await page.getByLabel('E-mail da unidade',{exact:true}).fill('contato@example.invalid');
 await page.getByLabel('WhatsApp (com DDD)',{exact:true}).fill('42999999999');
 await page.getByLabel('Mensal (R$)',{exact:true}).fill('125');
 const arquivo={name:'foto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=','base64')};
 await page.getByLabel('Foto de perfil da academia',{exact:true}).setInputFiles(arquivo);
 await expect(page.getByAltText('Foto de perfil da academia',{exact:true})).toBeVisible();
 await page.getByLabel('Fotos da estrutura',{exact:true}).setInputFiles(arquivo);
 await expect(page.getByAltText('Foto da estrutura 1',{exact:true})).toBeVisible();
 const resposta=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/academia/perfil'));
 await page.getByRole('button',{name:'Salvar Alterações',exact:true}).click();assert.equal((await resposta).status(),200);
 await page.reload();await expect(page.getByLabel('Nome da unidade',{exact:true})).toHaveValue('Academia Atualizada');await expect(page.getByLabel('Mensal (R$)',{exact:true})).toHaveValue('125.00');await expect(page.getByAltText('Foto de perfil da academia',{exact:true})).toBeVisible();await expect(page.getByAltText('Foto da estrutura 1',{exact:true})).toBeVisible();
 const r=await fetch(app.base+'/api/busca/catalogo',{headers:{Authorization:`Bearer ${aluno}`}});const d=await r.json();assert.match(d.servicos.find(s=>s.id==='1').foto,/^data:image\/png/);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/perfil-academia.png',fullPage:true});
 console.log('OK: perfil, contatos, preço, foto principal e galeria persistidos, imagem na busca e layout móvel.');
}finally{await browser?.close();await app.fechar();}
