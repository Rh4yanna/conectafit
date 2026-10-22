import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import sharp from 'sharp';
import {bancoVazioTeste} from '../scripts/banco-vazio-teste.mjs';
import {aplicarMigracoes} from './migracoes.js';
import {validarImagem,processarImagens,servirImagem,imagemReferenciada,gravarImagem} from './imagens-storage.js';
import {configuracaoBanco} from './configuracao-banco.js';

test('banco vazio, imagens: upload, leitura autorizada, troca, remoção e falhas',async()=>{
 const app=await bancoVazioTeste();let server;
 try {
  await aplicarMigracoes(app.db,{log:()=>{}});
  assert.equal(Number((await app.db.query('SELECT count(*) FROM migrations_conectafit')).rows[0].count),56);
  assert.equal((await app.db.query("SELECT count(*) FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f'")).rows[0].count>100,true);
  for(const [id,tipo] of [[1,'aluno'],[2,'aluno'],[3,'personal'],[4,'nutri'],[5,'academia']])await app.db.query('INSERT INTO usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,$4,$5)',[id,`Teste ${id}`,`imagem${id}@example.invalid`,'hash-ficticio',tipo]);
  const files=new Map();let falhar=false;
  const storage={bucket:'mock-bucket',async salvar(p,b){if(falhar)throw Error('segredo-fornecedor');files.set(p,b);},async ler(p){if(!files.has(p))throw Error('404');return files.get(p);},async excluir(p){files.delete(p);}};
  const api=express();api.use(express.json({limit:'4mb'}));
  // Autenticação simulada somente neste servidor de teste. A API real usa sessões.
  api.use(async(q,s,n)=>{const u=(await app.db.query('SELECT id,tipo_usuario FROM usuarios WHERE id=$1',[Number(q.get('x-test-user'))||0])).rows[0];if(!u)return s.sendStatus(401);q.usuario=u;n();});
  api.use(processarImagens(app.db,storage));
  api.put('/api/aluno/perfil',async(q,s)=>{await app.db.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2',[q.body.foto_url,q.usuario.id]);s.json(q.body);});
  api.get('/api/midia/:id',servirImagem(app.db,storage));
  server=api.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=(path,id,body)=>fetch(base+path,{method:body?'PUT':'GET',headers:{'x-test-user':String(id),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const png=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer();
  const data=`data:image/png;base64,${png.toString('base64')}`;
  for(const invalid of ['data:image/png;base64,aGVsbG8=','data:image/svg+xml;base64,PHN2Zy8+',data+'!',`data:image/jpeg;base64,${png.toString('base64')}`])await assert.rejects(()=>validarImagem(invalid));
  await assert.rejects(()=>validarImagem(data,1));
  const foto=(await (await call('/api/aluno/perfil',1,{foto_url:data})).json()).foto_url;
  assert.match(foto,/^\/api\/midia\//);assert.equal(files.size,1);
  assert.equal((await call(foto,0)).status,401);assert.equal((await call(foto,2)).status,404);
  const resposta=await call(foto,1);assert.equal(resposta.status,200);assert.equal(resposta.headers.get('cache-control'),'private, no-store');assert.equal((await sharp(Buffer.from(await resposta.arrayBuffer())).metadata()).format,'webp');
  assert.equal((await call('/api/aluno/perfil',2,{foto_url:foto})).status,403);
  assert.equal((await call('/api/aluno/perfil',1,{foto_url:'https://example.invalid/nao-cadastrada.png'})).status,400);
  assert.equal((await call('/api/aluno/perfil',1,{foto_url:data})).status,200);assert.equal(files.size,1);
  const novo=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer();
  const azul=`data:image/png;base64,${novo.toString('base64')}`;
  falhar=true;assert.equal((await call('/api/aluno/perfil',1,{foto_url:azul})).status,503);assert.equal((await call(foto,1)).status,200);falhar=false;
  const foto2=(await (await call('/api/aluno/perfil',1,{foto_url:azul})).json()).foto_url;
  assert.equal((await call(foto,1)).status,404);assert.equal((await call(foto2,1)).status,200);
  await call('/api/aluno/perfil',1,{foto_url:''});assert.equal((await call(foto2,1)).status,404);
  const ref=await gravarImagem(app.db,storage,{id:3},1,'evolucao',data,650*1024);
  await app.db.query('INSERT INTO fotos_evolucao(aluno_id,data_registro,frente_url,autor_personal_id) VALUES(1,CURRENT_DATE,$1,3)',[ref]);
  assert.equal((await call(ref,3)).status,404);
  await app.db.query("INSERT INTO conexoes_alunos(personal_id,aluno_id,status,ativo,permite_fotos) VALUES(3,1,'aceito',true,true)");
  assert.equal((await call(ref,3)).status,200);
  await app.db.query('UPDATE conexoes_alunos SET permite_fotos=false WHERE personal_id=3');assert.equal((await call(ref,3)).status,404);
  await app.db.query('DELETE FROM fotos_evolucao WHERE aluno_id=1');assert.equal((await call(ref,1)).status,404);
  const refeicao=await gravarImagem(app.db,storage,{id:1},1,'refeicao',data);
  await app.db.query("INSERT INTO diario_alimentar(aluno_id,chave_cliente,data,nome,status,foto) VALUES(1,gen_random_uuid(),CURRENT_DATE,'Teste','realizada',$1)",[refeicao]);
  await app.db.query("INSERT INTO conexoes_nutri(nutri_id,aluno_id,status,ativo,permite_diario,permite_fotos_refeicoes) VALUES(4,1,'aceito',true,true,false)");
  assert.equal((await call(refeicao,4)).status,404);await app.db.query('UPDATE conexoes_nutri SET permite_fotos_refeicoes=true');assert.equal((await call(refeicao,4)).status,200);
  await app.db.query('UPDATE conexoes_nutri SET ativo=false');assert.equal((await call(refeicao,4)).status,404);
  const galeria=await gravarImagem(app.db,storage,{id:5},5,'galeria',data);
  const academia=(await app.db.query("INSERT INTO perfis_academia(usuario_id,nome) VALUES(5,'Academia fictícia') RETURNING id")).rows[0];
  await app.db.query('INSERT INTO fotos_academia(academia_id,foto_url) VALUES($1,$2)',[academia.id,galeria]);
  assert.equal((await call(galeria,1)).status,200); // Catálogo exige aluno autenticado.
  assert.equal((await call(galeria,5)).status,200);
  assert.equal((await call(galeria,0)).status,401);
  assert.equal((await call(galeria,3)).status,404);
  await app.db.query('DELETE FROM fotos_academia WHERE academia_id=$1',[academia.id]);
  assert.equal((await call(galeria,1)).status,404);
  for(const row of (await app.db.query('SELECT * FROM imagens_storage')).rows)if(!await imagemReferenciada(app.db,row)){await storage.excluir(row.caminho);assert.equal(files.has(row.caminho),false);}
 }finally {if(server)await new Promise(r=>server.close(r));await app.fechar();}
});
test('DATABASE_URL não pode desabilitar validação TLS',()=>{
 const c=configuracaoBanco({DATABASE_URL:'postgres://user:senha@db.example/test?sslmode=no-verify',DB_SSL:'true'});
 assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.connectionString.includes('no-verify'),false);
});
