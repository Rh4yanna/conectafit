import {navegarAcademia,fecharModais} from './navegacao-academia-ui.mjs';
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
 const p=await pagina('academia');await p.goto(frontend+'/academia/dashboard');await expect(p.getByRole('heading',{name:'Visão Geral'})).toBeVisible();const aba=navegarAcademia(p);await aba('Matrículas');
 await p.getByRole('button',{name:'Gerar convite de matrícula'}).click();const link=await p.getByLabel('Link do convite').inputValue();const aluno=await pagina('aluno');await aluno.goto(link);await expect(aluno.getByText('Unidade: Unidade Teste',{exact:true})).toBeVisible();await aluno.getByRole('button',{name:'Confirmar cadastro na academia'}).click();await expect(aluno.getByRole('status').filter({hasText:'Cadastro recebido'})).toContainText('Cadastro recebido');
 console.log('OK: convite e aceite no navegador.');
}finally{await browser?.close();await app.fechar();}
