import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { servidorIsolado } from './teste-servidor-isolado.mjs';
const app=await servidorIsolado();let browser;
try {
  const tipos=['aluno','personal','nutri','academia'];
  for(const [i,tipo] of tipos.entries())await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[i+1,`Teste ${tipo}`,`${tipo}-feedback@example.invalid`,tipo]);
  browser=await chromium.launch({headless:true});
  for(const [i,tipo] of tipos.entries()){
    const token=await app.token(i+1),page=await browser.newPage({viewport:{width:390,height:844}}),erros=[];
    page.on('pageerror',e=>erros.push(e.message));page.on('dialog',d=>d.accept());
    let resposta='sucesso';
    await page.route('**/api/**',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(u.pathname==='/api/teste-feedback'){
        if(resposta==='rede')return route.abort('failed');
        return route.fulfill(resposta==='erro'?{status:400,json:{message:'Revise o campo nome.'}}:req.method()==='DELETE'?{status:204,body:''}:{status:200,json:{}});
      }
      const r=await fetch(app.base+u.pathname+u.search,{method:req.method(),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(req.postData()?{body:req.postData()}:{})});
      await route.fulfill({status:r.status,body:await r.text(),contentType:'application/json'});
    });
    await page.goto(`http://127.0.0.1:5187/${tipo}/${tipo==='aluno'?'perfil':'dashboard?aba=perfil'}`);
    const nome=tipo==='personal'?page.getByPlaceholder('Seu nome exibido no app'):tipo==='academia'?page.getByLabel('Nome da unidade'):tipo==='aluno'?page.locator('input[name="nome"]'):page.getByLabel('Nome completo',{exact:true});
    await nome.fill(`Perfil atualizado ${tipo}`);
    const salvar=page.getByRole('button',{name:tipo==='personal'?'Salvar Perfil':tipo==='nutri'?'Salvar perfil':'Salvar Alterações',exact:true});
    await salvar.click();
    const aviso=page.getByRole('complementary',{name:'Resultado da operação'});
    await expect(aviso.getByRole('status')).toBeVisible();
    await aviso.getByRole('button',{name:'Fechar mensagem da operação'}).click();
    for(const tamanho of [{width:390,height:844},{width:1280,height:900},{width:768,height:900}]){
      await page.setViewportSize(tamanho);
      if(tipo!=='academia'){
        const nav=page.getByRole('navigation',{name:`Navegação ${tipo==='aluno'?'do aluno':tipo==='personal'?'do personal':'do nutricionista'}`});
        await expect(nav).toBeVisible();
        assert.equal(await nav.locator('a,button').count(),5);
        await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
        await expect.poll(async()=>{
          const menu=await nav.boundingBox();const botao=await salvar.boundingBox();return botao.y+botao.height<=menu.y;
        }).toBe(true);
      }
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    for(const method of ['POST','PUT','DELETE']){
      await page.evaluate(async method=>{const {apiFetch}=await import('/src/config/api.js');await apiFetch('/teste-feedback',{method,body:'{}'});},method);
      await expect(aviso.getByRole('status')).toBeVisible();
      await aviso.getByRole('button',{name:'Fechar mensagem da operação'}).click();
    }
    resposta='erro';
    await page.evaluate(async()=>{const {apiFetch}=await import('/src/config/api.js');await apiFetch('/teste-feedback',{method:'PUT',body:'{}'});});
    await expect(aviso.getByRole('alert')).toContainText('A ação não foi concluída. Revise o campo nome.');
    await aviso.getByRole('button',{name:'Fechar mensagem da operação'}).click();
    resposta='rede';
    await page.evaluate(async()=>{const {apiFetch}=await import('/src/config/api.js');await apiFetch('/teste-feedback',{method:'POST',body:'{}'}).catch(()=>{});});
    await expect(aviso.getByRole('alert')).toContainText('Não foi possível confirmar o envio');
    assert.deepEqual(erros,[]);await page.close();
  }
  console.log('OK: perfis reais dos quatro usuários, feedback POST/PUT/DELETE, erros HTTP e de conexão; menus com cinco itens e conteúdo acessível em 390, 768 e 1280 px.');
}finally{await browser?.close();await app.fechar();}
