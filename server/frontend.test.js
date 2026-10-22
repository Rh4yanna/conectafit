import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {frontend} from './frontend.js';

test('frontend serve SPA sem substituir erros da API ou arquivos ausentes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'conectafit-frontend-'));let server;
 try {
  await writeFile(path.join(dir,'index.html'),'<!doctype html><title>ConectaFit teste</title>');
  await writeFile(path.join(dir,'teste.js'),'window.teste=true;');
  const app=express();app.use(frontend(dir));app.use((q,s)=>s.status(404).json({message:'Não encontrado'}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const url=`http://127.0.0.1:${server.address().port}`;
  for(const p of ['/','/login','/aluno/dashboard']){const r=await fetch(url+p);assert.equal(r.status,200);assert.match(await r.text(),/ConectaFit teste/);}
  assert.equal((await fetch(url+'/teste.js')).status,200);
  for(const p of ['/api/inexistente','/API/inexistente','/faltando.js','/.env'])assert.equal((await fetch(url+p)).status,404);
  assert.equal((await fetch(url+'/login',{method:'POST'})).status,404);
 }finally {if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
