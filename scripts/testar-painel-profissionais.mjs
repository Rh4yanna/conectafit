import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
const app=await servidorIsolado();let browser;
try{
 for(const [id,tipo] of [[1,'personal'],[2,'nutri'],[3,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,tipo,`${tipo}@teste.invalid`,tipo]);
 await app.db.query(`INSERT INTO ${app.schema}.conexoes_alunos(personal_id,aluno_id,status,ativo) VALUES(1,3,'aceito',TRUE)`);
 await app.db.query(`INSERT INTO ${app.schema}.conexoes_nutri(nutri_id,aluno_id,status,ativo) VALUES(2,3,'aceito',TRUE)`);
 const tokens=await Promise.all([1,2,3].map(id=>app.token(id)));
 const req=async(id,path,method='GET',body)=>{const r=await fetch(app.base+'/api'+path,{method,headers:{Authorization:`Bearer ${tokens[id-1]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const mes=new Date().toISOString().slice(0,7),data=mes+'-15';
 for(const id of [1,2]){
  assert.equal((await req(id,'/profissional/painel/calendario','POST',{data,horario:'10:00',observacao:`Compromisso ${id}`})).status,201);
  assert.equal((await req(id,'/profissional/painel/calendario','POST',{data,horario:'10:00',observacao:'Duplicado'})).status,409);
  const lista=await req(id,`/profissional/painel/calendario?mes=${mes}`);assert.equal(lista.data.length,1);assert.equal(lista.data[0].observacao,`Compromisso ${id}`);
 }
 assert.equal((await req(3,`/profissional/painel/calendario?mes=${mes}`)).status,403);
 const perfil={nome:'Nome salvo',contato:'42999999999',email_contato:'contato@teste.invalid',cidade:'Curitiba',formacao:'Formação salva',preco_mensal:120,crn:'1234'};
 assert.equal((await req(1,'/personal/perfil','POST',perfil)).status,200);
 assert.equal((await req(2,'/nutri/perfil/me','PUT',perfil)).status,200);
 assert.equal((await req(1,'/personal/perfil/1')).data.email_contato,perfil.email_contato);
 assert.equal((await req(2,'/nutri/perfil/me')).data.preco_mensal,'120.00');
 for(const id of [1,2])await app.db.query(`INSERT INTO ${app.schema}.notificacoes(usuario_id,categoria,chave,titulo,destino) VALUES($1,'compromissos','teste','Aviso de teste',$2)`,[id,id===1?'/personal/dashboard':'/nutri/dashboard']);
 browser=await chromium.launch({headless:true});
 for(const [id,tipo] of [[1,'personal'],[2,'nutri']]){
  const page=await browser.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(({tipo,id})=>localStorage.setItem('usuario',JSON.stringify({id,nome:tipo,tipo_usuario:tipo})),{tipo,id});
  await page.route('**/api/**',async route=>{const r=route.request(),u=new URL(r.url());const response=await fetch(app.base+u.pathname+u.search,{method:r.method(),headers:{Authorization:`Bearer ${tokens[id-1]}`,'Content-Type':'application/json'},...(r.postData()?{body:r.postData()}:{})});await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});});
  const base=`http://127.0.0.1:5187/${tipo}/dashboard`;
  const endereco={cidade:'Curitiba',estado:'PR',rua:'Rua de teste',numero:'10'};assert.equal((await req(id,'/servico/localizacao','PUT',endereco)).status,200);assert.equal((await req(id,'/servico/localizacao')).data.rua,endereco.rua);
  const oferta={versao:0,servicos:['Consulta individual'],especialidades:['Acompanhamento'],objetivos:[],modalidades:[],atendimento:['presencial'],disponibilidade:[{dia:1,inicio:'08:00',fim:'10:00'}],aceita_novos:true,recebe_visitas:false,oferece_experimental:false};assert.equal((await req(id,'/busca/oferta','PUT',oferta)).status,200);
  const resumo=await req(id,'/profissional/dashboard');assert.equal(resumo.status,200);assert.equal(resumo.data.alunos_ativos,1);
  await page.goto(base+'?aba='+ (tipo==='personal'?'alunos':'pacientes'));await expect(page.getByText('aluno',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Convites e importação',{exact:true})).toHaveCount(0);
  await page.goto(base+'?aba=agenda');await page.getByRole('button',{name:'15, 1 compromissos',exact:true}).click();await expect(page.getByText(`Compromisso ${id}`,{exact:true})).toBeVisible();
  await page.getByLabel('Horário',{exact:true}).fill('11:00');await page.getByLabel('Observação do compromisso').fill('Retorno cadastrado na tela');await page.getByRole('button',{name:'Salvar compromisso'}).click();await expect(page.getByText('Compromisso salvo.',{exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'15, 2 compromissos',exact:true}).click();await expect(page.getByText('Retorno cadastrado na tela',{exact:true})).toBeVisible();
  await page.goto(base+'?aba=perfil');await expect(page.getByLabel('E-mail de contato',{exact:true})).toHaveValue(perfil.email_contato);
  if(tipo==='nutri'){
   await page.getByLabel('CRN',{exact:true}).fill('CRN-TESTE-456');
   await page.locator('input[type=file]').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=','base64')});
   await expect(page.getByAltText('Preview')).toBeVisible();
  }
  await page.getByLabel('E-mail de contato',{exact:true}).fill('alterado@teste.invalid');const salvo=page.waitForResponse(r=>r.url().includes(tipo==='personal'?'/personal/perfil':'/nutri/perfil/me')&&r.request().method()!=='GET');await page.getByRole('button',{name:/Salvar (perfil|altera)/i}).click();assert.equal((await salvo).status(),200);
  assert.equal((await req(id,tipo==='personal'?'/personal/perfil/1':'/nutri/perfil/me')).data.email_contato,'alterado@teste.invalid');
  await expect(page.getByRole('status').filter({hasText:/Perfil (salvo|atualizado)/}).first()).toBeVisible();await page.reload();await expect(page.getByLabel('E-mail de contato',{exact:true})).toHaveValue('alterado@teste.invalid');
  if(tipo==='nutri'){
   await expect(page.getByLabel('CRN',{exact:true})).toHaveValue('CRN-TESTE-456');
   await expect(page.getByAltText('Preview')).toHaveAttribute('src',/^data:image\/png;base64,/);
   await page.setViewportSize({width:390,height:844});
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:'test-results/perfil-nutri.png',fullPage:true});
  }
  tokens[id-1]=await app.token(id);
  assert.equal((await req(id,tipo==='personal'?'/personal/perfil/1':'/nutri/perfil/me')).data.email_contato,'alterado@teste.invalid');
  await page.goto(base+'?aba=avisos');await page.getByRole('button',{name:/Aviso de teste/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
  await expect(page.getByRole('button',{name:/Aviso de teste/})).toContainText('Lida');
  await page.getByRole('button',{name:'Selecionar notificações para excluir'}).click();await page.getByLabel('Selecionar todas',{exact:true}).check();await page.getByRole('button',{name:'Excluir selecionadas'}).click();await expect(page.getByText('Nenhuma notificação.',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Nenhuma notificação.',{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.goto(base+'?aba=agenda');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'15, 2 compromissos',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/calendario-${tipo}.png`,fullPage:true});
  assert.deepEqual(erros,[]);await page.close();
 }
 console.log('OK: agenda, duplicidade, isolamento, perfis, releitura do banco, notificações e mobile nos dois perfis.');
}finally{await browser?.close();await app.fechar();}
