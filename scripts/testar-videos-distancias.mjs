import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { servidorIsolado } from './teste-servidor-isolado.mjs';
const app = await servidorIsolado();
let browser;
try {
  for (const [id, nome, tipo] of [[1,'Aluno','aluno'],[2,'Personal Cidade','personal'],[3,'Academia Rota','academia']])
    await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario,cidade) VALUES($1,$2,$3,'teste',$4,'São Paulo')`, [id,nome,`video-rota-${id}@example.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.localizacoes_servicos(usuario_id,cidade,rua,numero,estado,latitude,longitude) VALUES(3,'São Paulo','Rua Teste','10','SP',-23.56,-46.63)`);
  const tokenAcademia=await app.token(3);
  const endereco={cidade:'São Paulo',rua:'Rua Teste',numero:'10',estado:'SP',latitude:-23.56,longitude:-46.63};
  const salvarEndereco=body=>fetch(`${app.base}/api/servico/localizacao`,{method:'PUT',headers:{Authorization:`Bearer ${tokenAcademia}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await salvarEndereco({...endereco,latitude:100})).status,400);
  assert.equal((await salvarEndereco({...endereco,longitude:''})).status,400);
  assert.equal((await salvarEndereco({...endereco,latitude:'',longitude:''})).status,200);
  assert.equal((await salvarEndereco(endereco)).status,200);
  const local=await fetch(`${app.base}/api/servico/localizacao`,{headers:{Authorization:`Bearer ${tokenAcademia}`}});
  const salvo=await local.json();assert.equal(Number(salvo.latitude),-23.56);assert.equal(Number(salvo.longitude),-46.63);
  const token = await app.token(1);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ geolocation: { latitude: -23.55, longitude: -46.63 }, permissions: ['geolocation'], viewport: {width:390,height:844} });
  const page = await context.newPage();
  const erros=[];page.on('pageerror',e=>erros.push(e.message));
  let consultas=0;
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.pathname.startsWith('/api/academias/distancias')){consultas++;return route.abort();}
    const r=await fetch(app.base+u.pathname+u.search,{method:req.method(),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(req.postData()?{body:req.postData()}:{})});
    await route.fulfill({status:r.status,body:await r.text(),contentType:'application/json'});
  });
  await page.goto('http://127.0.0.1:5187/aluno/servicos');
  const personal=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Personal Cidade',exact:true})});
  await expect(personal).toContainText('São Paulo');await expect(personal).not.toContainText('Ative a localização');
  assert.equal(consultas,0);
  await page.getByRole('button',{name:'Ativar localização',exact:true}).click();
  const academia=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Academia Rota',exact:true})});
  await expect(academia.getByText(/Rua Teste.*São Paulo/)).toHaveCount(1);
  await expect(page.getByText('Localização autorizada e obtida neste dispositivo.',{exact:true})).toBeVisible();
  await page.setViewportSize({width:1280,height:900});
  const botoes=await page.getByRole('article').getByRole('button',{name:'Ver mais',exact:true}).evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
  assert.ok(Math.max(...botoes)-Math.min(...botoes)<2);
  await page.setViewportSize({width:390,height:844});
  await expect(academia).toContainText('1.1 km aprox.');await expect(academia).toContainText('Em linha reta');await expect(personal).not.toContainText('km');assert.equal(consultas,0);
  await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_sucesso,erro)=>erro({code:1});});
  await page.getByRole('button',{name:'Atualizar localização',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Localização bloqueada'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const r=await fetch(`${app.base}/api/exercicios`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();assert.ok(d.total>0);assert.ok(d.resultados.every(e=>e.videos.length));
  assert.deepEqual(erros,[]);
  console.log('OK: cidade sem distância para personal, localização sob demanda, distancia local sem API externa, permissao bloqueada, layout móvel e catálogo só com vídeos.');
} finally { await browser?.close();await app.fechar(); }
