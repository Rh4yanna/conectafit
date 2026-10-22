import {navegarAcademia} from './navegacao-academia-ui.mjs';
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
 const p=await pagina('academia');await p.goto(frontend+'/academia/dashboard');await expect(p.getByRole('heading',{name:'Visão Geral'})).toBeVisible();
 const aba=navegarAcademia(p);

 await aba('Relat\u00f3rios');await expect(p.getByRole('heading',{name:'Relat\u00f3rios da academia'})).toBeVisible();await expect(p).toHaveURL(/aba=relatorios/);await p.reload();await expect(p.getByRole('heading',{name:'Relat\u00f3rios da academia'})).toBeVisible();await aba('Estoque');await expect(p).toHaveURL(/aba=estoque/);await p.goBack();await expect(p.getByRole('heading',{name:'Relat\u00f3rios da academia'})).toBeVisible();await expect(p.getByText('Nenhuma movimenta\u00e7\u00e3o de caixa no per\u00edodo.',{exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:'Base ativa ao longo do período'})).toBeVisible();const download=p.waitForEvent('download');await p.getByRole('button',{name:'Exportar relat\u00f3rio (CSV)'}).click();assert.ok((await download).suggestedFilename().endsWith('.csv'));await p.setViewportSize({width:390,height:844});await expect.poll(()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);console.log('OK: relatorios, estados vazios, exportacao e celular.');
}finally{await browser?.close();await app.fechar();}
