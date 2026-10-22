import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
import {hojeEvolucao} from '../server/evolucao.js';
const app=await servidorIsolado();let browser;
try{
 const users={academia:{id:1,nome:'Unidade Teste'},aluno:{id:2,nome:'Aluno Convidado'},personal:{id:3,nome:'Professor Equipe'}};
 for(const[tipo,u]of Object.entries(users))await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[u.id,u.nome,`${tipo}@example.invalid`,tipo]);
 const tokens=Object.fromEntries(await Promise.all(Object.entries(users).map(async ([tipo,u])=>[tipo,await app.token(u.id)])));
 const frontend='http://127.0.0.1:5187',erros=[];browser=await chromium.launch({headless:true});
 async function pagina(tipo){const p=await browser.newPage({viewport:{width:1360,height:960}});p.setDefaultTimeout(15000);p.on('pageerror',e=>erros.push(e.message));await p.addInitScript(({token,usuario,tipo})=>{localStorage.setItem('token',token);localStorage.setItem('usuario',JSON.stringify({...usuario,tipo_usuario:tipo}));},{token:tokens[tipo],usuario:users[tipo],tipo});await p.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url()),r=await fetch(app.base+u.pathname+u.search,{method:req.method(),headers:{Authorization:`Bearer ${tokens[tipo]}`,'Content-Type':'application/json'},...(req.postData()?{body:req.postData()}:{})});await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/json',body:Buffer.from(await r.arrayBuffer())});});return p;}

 const p=await pagina('academia');await p.goto(frontend+'/academia/dashboard');
 await expect(p.getByRole('heading',{name:'Visão Geral'})).toBeVisible();
 async function abrir(nome){await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await p.getByRole('navigation',{name:'Menu principal'}).getByRole('link',{name:nome,exact:true}).click();}
 for(const width of [1360,768,390]){
  await p.setViewportSize({width,height:900});
  await abrir('Alunos / Gestão de contas');
  await p.getByRole('button',{name:'Adicionar aluno',exact:true}).click();
  await expect(p.getByRole('dialog',{name:'Adicionar aluno'})).toBeVisible();
  await expect.poll(()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await p.getByRole('button',{name:'Fechar',exact:true}).click();
  await abrir('Planos');await p.getByRole('button',{name:'Criar plano',exact:true}).click();
  await expect(p.getByRole('form',{name:'Criar plano comercial'})).toBeVisible();await p.keyboard.press('Escape');
  await abrir('Agendamentos');await expect(p.getByRole('region',{name:'Calendário da academia'})).toBeVisible();
  await expect.poll(()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await abrir('Perfil da academia');await p.getByLabel('Razão social',{exact:true}).fill('Unidade Teste Ltda');
 await p.getByRole('button',{name:'Salvar Alterações',exact:true}).click();
 await expect(p.getByText('Informações salvas com sucesso.',{exact:true})).toBeVisible();
 await p.reload();await expect(p.getByLabel('Razão social',{exact:true})).toHaveValue('Unidade Teste Ltda');
 await abrir('Notas fiscais');await expect(p.getByText('Integração fiscal não configurada.',{exact:true})).toBeVisible();
 await abrir('Controle de acesso / Catracas');await expect(p.getByText('Nenhum equipamento conectado.',{exact:true})).toBeVisible();
 await mkdir('test-results',{recursive:true});await p.screenshot({path:'test-results/academia-padronizada-mobile.png',fullPage:true});
 assert.deepEqual(erros,[]);console.log('OK: menu, modais, agenda, perfil persistido e 3 tamanhos de tela.');
}finally{await browser?.close();await app.fechar();}
