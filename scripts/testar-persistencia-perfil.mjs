import assert from 'node:assert/strict';
import {servidorIsolado} from './teste-servidor-isolado.mjs';
const app=await servidorIsolado();
try {
 await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES(1,'Aluno Teste','perfil@example.invalid','teste','aluno')`);
 const token=await app.token(1);
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-ConectaFit-Request':'1'};
 const perfil={nome:'Aluno Atualizado',telefone:'(42) 99999-1234',cidade:'Guarapuava',foto_url:null};
 const salvar=await fetch(app.base+'/api/aluno/perfil',{method:'PUT',headers,body:JSON.stringify(perfil)});
 assert.equal(salvar.status,200,await salvar.text());
 const banco=(await app.db.query(`SELECT nome,telefone,cidade,foto_url FROM ${app.schema}.usuarios WHERE id=1`)).rows[0];
 assert.deepEqual(banco,perfil);
 const leitura=await fetch(app.base+'/api/usuario/me',{headers});assert.equal(leitura.status,200);
 const usuario=await leitura.json();for(const k of Object.keys(perfil))assert.equal(usuario[k],perfil[k]);
 const novamente=await fetch(app.base+'/api/aluno/perfil',{method:'PUT',headers,body:JSON.stringify({...usuario,cidade:'Curitiba'})});assert.equal(novamente.status,200);
 assert.equal((await app.db.query(`SELECT telefone FROM ${app.schema}.usuarios WHERE id=1`)).rows[0].telefone,perfil.telefone);
 console.log('OK: perfil gravado no PostgreSQL, recarregado e salvo novamente sem perder telefone.');
}finally{await app.fechar();}
