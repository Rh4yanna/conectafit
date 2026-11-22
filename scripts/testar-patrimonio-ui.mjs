import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
const server=await createServer({configFile:false,plugins:[react({fastRefresh:false})],server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true});
try{const url=server.resolvedUrls.local[0];for(const largura of [320,375,390,768,1440]){
 const page=await browser.newPage({viewport:{width:largura,height:900}}),erros=[];page.on('pageerror',e=>erros.push(e.message));
 await page.route('**/teste-patrimonio',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixture-patrimonio.jsx"></script></body></html>'}));
 await page.goto(`${url}teste-patrimonio`);await page.getByRole('heading',{name:'Estoque e Patrimônio'}).waitFor();await page.getByText('Papel toalha',{exact:true}).filter({visible:true}).first().waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Rolagem horizontal em ${largura}px`);
 if(await page.getByRole('button',{name:/Nova venda|Carrinho/}).count())throw Error('Ação de venda encontrada no estoque');
 await page.getByLabel('Pesquisar').fill('Papel');await page.getByLabel('Filtrar situação').selectOption('baixo');
 await page.getByRole('button',{name:'Novo material'}).click();let modal=page.getByRole('dialog');await modal.getByLabel('Nome',{exact:true}).fill('Álcool');await modal.getByLabel('Categoria',{exact:true}).fill('Higiene');await modal.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByText('Item salvo.').waitFor();
 await page.getByRole('button',{name:'Registrar movimentação'}).click();modal=page.getByRole('dialog');await modal.getByLabel('Material ou equipamento').selectOption('1');await modal.getByLabel('Motivo',{exact:true}).fill('Reposição');await modal.getByRole('button',{name:'Registrar movimentação'}).click();await page.getByText('Movimentação registrada.').waitFor();
 await page.getByRole('button',{name:'Manutenção',exact:true}).click();await page.getByRole('button',{name:'Registrar manutenção'}).click();modal=page.getByRole('dialog');await modal.getByLabel('Equipamento individual').selectOption('2');await modal.getByLabel('Descrição do problema').fill('Revisão do motor');await modal.getByLabel('Responsável',{exact:true}).fill('Técnico');await modal.getByRole('button',{name:'Salvar manutenção'}).click();await page.getByText('Manutenção salva.').waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Página alargou em ${largura}px`);if(erros.length)throw Error(erros.join('; '));await page.close();console.log(`${largura}px: filtros, materiais, movimentações e manutenção verificados`);
 }}finally{await browser.close();await server.close();}
