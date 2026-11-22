import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
const server=await createServer({configFile:false,plugins:[react({fastRefresh:false})],server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true});
try{
 const url=server.resolvedUrls.local[0];
 for(const largura of [320,375,390,768,1440]){
  const page=await browser.newPage({viewport:{width:largura,height:900}});
  page.on('pageerror',e=>console.error('Erro da página:',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('Console:',m.text());});
  await page.route('**/teste-insights',route=>route.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixture-insights.jsx"></script></body></html>'}));
  await page.goto(`${url}teste-insights`);await page.getByText('Desempenho financeiro').waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error(`Rolagem horizontal em ${largura}px`);
  if(await page.getByText(/NaN|Infinity|undefined/).count())throw Error(`Valor inválido em ${largura}px`);
  await page.getByLabel('Período').selectOption('personalizado');await page.getByLabel('Início').waitFor();
  await page.getByRole('button',{name:'Diário',exact:true}).click();await page.getByRole('button',{name:'Exportar CSV'}).waitFor();
  await page.close();console.log(`${largura}px: filtros, gráficos e largura verificados`);
 }
}finally{await browser.close();await server.close();}
