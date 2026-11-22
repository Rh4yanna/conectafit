import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
const server=await createServer({configFile:false,plugins:[react({fastRefresh:false})],server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true});
try{const url=server.resolvedUrls.local[0];for(const largura of [320,375,390,768,1440]){
 const page=await browser.newPage({viewport:{width:largura,height:900}});const erros=[];page.on('pageerror',e=>erros.push(e.message));
 await page.route('**/teste-leads',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixture-leads.jsx"></script></body></html>'}));
 await page.goto(`${url}teste-leads`);await page.getByRole('heading',{name:'Gestão de Leads'}).waitFor();await page.getByText('Ana Costa',{exact:true}).first().waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Rolagem horizontal em ${largura}px`);
 await page.getByLabel('Buscar',{exact:true}).fill('ana');await page.getByLabel('Etapa de Ana Costa').selectOption('em_contato');await page.getByText('Etapa atualizada.').waitFor();
 await page.getByRole('button',{name:'Ver detalhes'}).first().click();await page.getByRole('button',{name:'Interações',exact:true}).click();
 await page.getByLabel('Tipo de interação').selectOption('WhatsApp');await page.getByLabel('Observação do contato').fill('Conversamos sobre horários.');await page.getByRole('button',{name:'Registrar contato'}).last().click();await page.getByText('WhatsApp: Conversamos sobre horários.').waitFor();
 await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Kanban'}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Kanban alargou a página em ${largura}px`);
 if(largura===390){await page.getByRole('button',{name:'Novo lead',exact:true}).click();const modal=page.getByRole('dialog');await modal.getByLabel('Nome',{exact:true}).fill('Bruno Costa');await modal.getByLabel('Telefone',{exact:true}).fill('42999999999');await modal.getByLabel('Origem do contato').fill('Indicação');await modal.getByRole('button',{name:'Cadastrar lead'}).click();await page.getByText('Lead cadastrado.').waitFor();await page.getByLabel('Buscar',{exact:true}).fill('Bruno');await page.getByText('Bruno Costa',{exact:true}).first().waitFor();}
 if(erros.length)throw Error(erros.join('; '));await page.close();console.log(`${largura}px: pesquisa, etapa, contato, painel e Kanban verificados`);
 }}finally{await browser.close();await server.close();}
