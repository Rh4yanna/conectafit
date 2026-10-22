import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {spawn} from 'node:child_process';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
const app=await servidorIsolado();let browser,vite;
try{
  const senha='SenhaSegura!2026',hash=await bcrypt.hash(senha,12);
  const perfis=[['aluno','Aluno'],['personal','Personal'],['nutri','Nutricionista'],['academia','Academia']];
  for(const [i,[perfil]]of perfis.entries())await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,$4,$5)`,[i+1,`Pessoa ${perfil}`,`${perfil}@example.invalid`,hash,perfil]);
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{env:{...process.env,PORT:new URL(app.base).port},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let log='';vite.stdout.on('data',d=>{log+=d;});vite.stderr.on('data',d=>{log+=d;});
  const front='http://127.0.0.1:5187';let pronto=false;
  for(let i=0;i<100;i++){if(vite.exitCode!==null)throw new Error(log);try{if((await fetch(front+'/api/health')).ok){pronto=true;break;}}catch{/* inicializacao */}await new Promise(r=>setTimeout(r,100));}
  assert.ok(pronto,'Vite de teste iniciou');browser=await chromium.launch({headless:true});
  for(const [perfil,label]of perfis){
    const context=await browser.newContext(),p=await context.newPage();let outraAba;const erros=[];p.on('pageerror',e=>erros.push(e.message));p.setDefaultTimeout(20000);
    await p.goto(front+'/login');await p.getByRole('button',{name:label,exact:true}).click();
    await p.locator('input[name=email]').fill(`${perfil}@example.invalid`);await p.locator('input[name=senha]').fill(senha);
    const resposta=p.waitForResponse(r=>r.url().endsWith('/api/login')&&r.request().method()==='POST');await p.locator('button[type=submit]').click();
    const login=await resposta;assert.equal(login.status(),200);assert.equal((await login.json()).token,undefined);
    await expect(p).toHaveURL(new RegExp(`/${perfil}/dashboard`));await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(p.getByRole('button',{name:'Sair da conta',exact:true}).first()).toBeVisible();
    const cookie=(await context.cookies()).find(c=>c.name==='conectafit_sessao');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Lax');
    assert.equal(await p.evaluate(()=>localStorage.getItem('token')),null);assert.ok(!(await p.evaluate(()=>document.cookie)).includes('conectafit_sessao'));
    await p.reload();await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(p.getByRole('button',{name:'Sair da conta',exact:true}).first()).toBeVisible();
    if(perfil==='aluno'){
      outraAba=await context.newPage();await outraAba.goto(front+'/aluno/dashboard');await expect(outraAba.getByRole('button',{name:'Abrir menu',exact:true})).toBeVisible();
      await p.route('**/api/logout',r=>r.abort());await p.getByRole('button',{name:'Sair da conta',exact:true}).first().click();await expect(p.getByRole('alert')).toContainText('Não foi possível');assert.ok(p.url().includes('/aluno/dashboard'));await p.unroute('**/api/logout');
    }
    await p.getByRole('button',{name:'Sair da conta',exact:true}).first().click();await expect(p).toHaveURL(front+'/login');if(outraAba)await expect(outraAba).toHaveURL(front+'/login');
    assert.equal((await context.cookies()).some(c=>c.name==='conectafit_sessao'),false);
    const roubado=await fetch(app.base+'/api/usuario/me',{headers:{Cookie:`conectafit_sessao=${cookie.value}`}});assert.equal(roubado.status,401);
    await p.goto(`${front}/${perfil}/dashboard`);await expect(p).toHaveURL(front+'/login');assert.deepEqual(erros,[]);await context.close();
  }
  console.log('OK: login real e cookie HttpOnly nos quatro perfis, recarga, logout, copia revogada, falha de rede e rota protegida.');
}finally{await browser?.close();if(vite&&vite.exitCode===null){const saiu=new Promise(r=>vite.once('exit',r));vite.kill();await saiu;}await app.fechar();}
