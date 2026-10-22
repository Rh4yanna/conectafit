import {chromium} from '@playwright/test';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
import fs from 'node:fs/promises';
const out='test-results/fitness-tech';await fs.mkdir(out,{recursive:true});
const app=await servidorIsolado();let browser;
try{
const q=(sql,args=[])=>app.db.query(sql.replaceAll('T.',app.schema+'.'),args);
const users={aluno:{id:1,nome:'Aluno Demonstrativo'},personal:{id:2,nome:'Personal Exemplo'},nutri:{id:3,nome:'Nutricionista Exemplo'},academia:{id:4,nome:'Academia Demonstrativa'}};
for(const [tipo,u] of Object.entries(users)){await q("INSERT INTO T.usuarios(id,nome,email,senha_hash,tipo_usuario,cidade) VALUES($1,$2,$3,'teste',$4,'Cidade Exemplo')",[u.id,u.nome,tipo+'@example.invalid',tipo]);await q('INSERT INTO T.primeiros_passos(usuario_id,recolhido) VALUES($1,true)',[u.id]);}
await q("INSERT INTO T.perfis_personal(usuario_id,nome,cidade,sobre_mim,preco_mensal) VALUES(2,'Personal Exemplo','Cidade Exemplo','Treinamento individual e acompanhamento de objetivos.',180)");
await q("INSERT INTO T.perfis_nutri(usuario_id,nome,cidade,bio,preco_mensal) VALUES(3,'Nutricionista Exemplo','Cidade Exemplo','Planejamento alimentar e acompanhamento individual.',160)");
await q("INSERT INTO T.perfis_academia(usuario_id,nome,cidade,bio,preco_mensal) VALUES(4,'Academia Demonstrativa','Cidade Exemplo','Musculacao e atividades em grupo.',120)");
await q("INSERT INTO T.conexoes_alunos(personal_id,aluno_id,status,ativo,permite_treinos) VALUES(2,1,'aceito',true,true)");
await q("INSERT INTO T.conexoes_nutri(nutri_id,aluno_id,status,ativo,permite_dietas) VALUES(3,1,'aceito',true,true)");
const cat=JSON.parse(await fs.readFile('server/data/exercicios.json','utf8')).exercicios.filter(e=>e.videos?.length).slice(0,3);
const ex=cat.map((e,i)=>({id_exercicio:'demo-'+i,catalogo_id:e.id,nome:e.nome,series:3,repeticoes:'12',carga:'A definir',descanso_segundos:60,orientacoes:'Exemplo demonstrativo para o artigo.',demonstracao_catalogo:e}));
await q("INSERT INTO T.treinos(usuario_id,personal_id,titulo,criado_por,origem,exercicios,dias_semana,objetivo,versao_profissional) VALUES(1,2,'Treino A - Demonstrativo','Personal Exemplo','personal',$1,ARRAY[0,1,2,3,4,5,6]::smallint[],'Organizacao de uma rotina de treinamento',1)",[JSON.stringify(ex)]);
await q("INSERT INTO T.planos_alimentares(aluno_id,nutri_id,titulo,descricao,origem,autoria,vigente) VALUES(1,3,'Plano alimentar demonstrativo','Dados ficticios para demonstracao da interface.','nutricionista','Nutricionista Exemplo',true)");
for(const [i,n,h,food] of [[0,'Cafe da manha','07:30','Aveia'],[1,'Almoco','12:00','Arroz'],[2,'Lanche','16:00','Banana']])await q('INSERT INTO T.refeicoes_plano(plano_id,nome,horario,alimentos,ordem,orientacoes) VALUES(1,$1,$2,$3,$4,$5)',[n,h,JSON.stringify([{nome:food,quantidade:1,unidade:'porcao',substituicoes:[]}]),i,'Exemplo de preenchimento, sem finalidade de prescricao.']);
for(let i=1;i<=5;i++){await q("INSERT INTO T.matriculas_academia(academia_id,aluno_nome,aluno_email,ativo,situacao,valor_mensal,inicio,termino) VALUES(4,$1,$2,true,'ativa',120,CURRENT_DATE,CURRENT_DATE+90)",['Aluno Exemplo '+i,'demo'+i+'@example.invalid']);await q("INSERT INTO T.mensalidades_academia(matricula_id,competencia,vencimento,valor) VALUES($1,date_trunc('month',CURRENT_DATE),CURRENT_DATE+7,120)",[i]);}
await q("INSERT INTO T.lancamentos_academia(academia_id,tipo,descricao,valor,data,autor_id) VALUES(4,'receita','Mensalidades demonstrativas',600,CURRENT_DATE,4)");
await q("INSERT INTO T.versoes_alimentares(plano_id,versao,conteudo) SELECT p.id,p.versao,to_jsonb(p) || jsonb_build_object('refeicoes',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.ordem) FROM T.refeicoes_plano r WHERE r.plano_id=p.id)) FROM T.planos_alimentares p"); const tokens={};for(const [t,u]of Object.entries(users))tokens[t]=await app.token(u.id);
browser=await chromium.launch({headless:true});
async function page(tipo,mobile=false){const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1080},deviceScaleFactor:1});p.setDefaultTimeout(15000);await p.addInitScript(({u,t})=>localStorage.setItem('usuario',JSON.stringify({...u,tipo_usuario:t})),{u:users[tipo],t:tipo});await p.route('**/api/**',async r=>{try{const req=r.request(),url=new URL(req.url());const res=await fetch(app.base+url.pathname+url.search,{method:req.method(),headers:{Authorization:'Bearer '+tokens[tipo],'Content-Type':'application/json'},...(req.postData()?{body:req.postData()}:{})});if(res.status>=400)console.log('API '+res.status+' '+url.pathname);await r.fulfill({status:res.status,contentType:res.headers.get('content-type')||'application/json',body:Buffer.from(await res.arrayBuffer())});}catch{await r.abort();}});return p;}
const failures=[];
for(const tipo of [process.argv[2]||'aluno']){
 const p=await page(tipo);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5187/'+tipo+'/dashboard');await p.waitForLoadState('networkidle');
 for(const width of [1440,768,390,320]){
  await p.setViewportSize({width,height:960});await p.waitForTimeout(150);
  const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,sidebar:getComputedStyle(document.querySelector('.app-sidebar')).display,footer:getComputedStyle(document.querySelector('.app-bottom-nav')).display,padding:parseFloat(getComputedStyle(document.querySelector('[data-menu-inferior]')).paddingBottom),height:document.querySelector('.app-bottom-nav').getBoundingClientRect().height}));
  if(layout.overflow||(width>=1200?layout.sidebar==='none'||layout.footer!=='none':layout.sidebar!=='none'||layout.footer==='none'||layout.padding<layout.height))failures.push({tipo,width,layout});
  await p.screenshot({path:out+'/'+tipo+'-'+width+'.png',fullPage:true});
 }
 await p.setViewportSize({width:1440,height:960});
 const destinations=await p.locator('.app-sidebar nav a').evaluateAll(a=>a.map(x=>x.href));
 for(const url of destinations){await p.locator('.app-sidebar nav a[href=\"'+new URL(url).pathname+new URL(url).search+'\"]').click();await p.waitForLoadState('networkidle');for(const width of [390,1440]){await p.setViewportSize({width,height:960});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))failures.push({tipo,url,width,overflow:true});}await p.screenshot({path:out+'/'+tipo+'-area-'+destinations.indexOf(url)+'.png'});}
 await p.goto('http://127.0.0.1:5187/'+tipo+'/dashboard');await p.waitForLoadState('networkidle');
 await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await p.getByRole('button',{name:'Modo claro',exact:true}).click();await p.getByRole('button',{name:'Fechar menu',exact:true}).click();
 await p.screenshot({path:out+'/'+tipo+'-claro.png',fullPage:true});
 if(errors.length)failures.push({tipo,errors});await p.close();console.log('Revisado '+tipo);
}
await fs.writeFile(out+'/resultado-'+(process.argv[2]||'aluno')+'.json',JSON.stringify(failures,null,2));if(failures.length)throw new Error(JSON.stringify(failures));console.log('OK: perfil, temas, navegacao, 1440/768/390/320px e reserva de espaco mobile.');
}finally{await browser?.close();await app.fechar();}
