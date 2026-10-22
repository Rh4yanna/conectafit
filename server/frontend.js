import express from 'express';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import path from 'node:path';

export function frontend(diretorio=fileURLToPath(new URL('../dist/',import.meta.url))) {
  const index=path.join(diretorio,'index.html');
  if(!existsSync(index))throw new Error('Frontend ausente. Execute npm run build antes de iniciar.');
  const router=express.Router();
  router.use((req,res,next)=>{
    if(/^\/api(?:\/|$)/i.test(req.path))return next('router');
    next();
  });
  router.use(express.static(diretorio,{index:false,dotfiles:'deny'}));
  router.use((req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method)||req.path.split('/').some(p=>p.startsWith('.'))||path.extname(req.path)||!req.accepts('html'))return next();
    res.set('Cache-Control','no-cache').sendFile(index);
  });
  return router;
}
