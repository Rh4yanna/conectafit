import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
const server=await createServer({configFile:false,plugins:[react({fastRefresh:false})],server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true});
try{const url=server.resolvedUrls.local[0];for(const largura of [320,375,390,768,1440]){
 const page=await browser.newPage({viewport:{width:largura,height:900}}),erros=[];page.on('pageerror',e=>erros.push(e.message));
 await page.route('**/teste-financeiro',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixture-financeiro.jsx"></script></body></html>'}));
 await page.goto(`${url}teste-financeiro`);await page.getByRole('heading',{name:'Gestão Financeira'}).waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Rolagem horizontal em ${largura}px`);
 if(await page.getByText(/NaN|Infinity|undefined/).count())throw Error(`Valor inválido em ${largura}px`);
 if(largura===390){const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar cobranças'}).click();const arquivo=await download;if(!arquivo.suggestedFilename().startsWith('mensalidades-'))throw Error('Exportação de cobranças incorreta');}
 await page.getByLabel('Buscar aluno').fill('Ana');await page.getByRole('button',{name:'Detalhes'}).first().click();await page.getByRole('button',{name:'Registrar pagamento'}).waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Gerar mensalidade',exact:true}).click();await page.getByRole('dialog').getByLabel('Matrícula').waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Nova movimentação'}).click();await page.getByRole('dialog').getByLabel('Valor (R$)').waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Estornar',exact:true}).first().click();await page.getByRole('heading',{name:'Confirmar estorno'}).waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Contas a pagar',exact:true}).click();await page.getByText('Energia',{exact:true}).filter({visible:true}).first().waitFor();await page.getByRole('button',{name:'Nova conta'}).click();await page.getByRole('dialog').getByLabel('Fornecedor ou beneficiário').waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Histórico de ações',exact:true}).click();await page.getByText('Cadastro',{exact:true}).first().waitFor();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Histórico alargou página em ${largura}px`);
 if(erros.length)throw Error(erros.join('; '));await page.close();console.log(`${largura}px: indicadores, filtros, ações, contas e histórico verificados`);
 }}finally{await browser.close();await server.close();}
