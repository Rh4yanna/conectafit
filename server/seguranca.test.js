import {validarProducao} from './configuracao-producao.js';
import {criarSessao,nomeCookie,hashSessao} from './sessoes-conta.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {senhaAceitavel} from './seguranca-autenticacao.js';

test('senhas respeitam bytes UTF-8 sem truncamento silencioso', () => {
  assert.equal(senhaAceitavel('a'.repeat(72)), true);
  assert.equal(senhaAceitavel('a'.repeat(73)), false);
  assert.equal(senhaAceitavel('\u00e1'.repeat(36)), true);
  assert.equal(senhaAceitavel('\u00e1'.repeat(37)), false);
  assert.equal(senhaAceitavel('curta'), false);
});

test('publicacao recusa configuracao insegura',()=>{
  const config={NODE_ENV:'production',FRONTEND_URL:'https://conectafit.example',DB_HOST:'127.0.0.1',IMAGE_STORAGE:'firebase',FIREBASE_STORAGE_BUCKET:'bucket-teste'};
  assert.doesNotThrow(()=>validarProducao(config));
  const render={...config,FRONTEND_URL:'',RENDER:'true',SERVE_FRONTEND:'true',RENDER_EXTERNAL_URL:'https://conectafit-teste.onrender.com'};
  assert.doesNotThrow(()=>validarProducao(render));
  assert.equal(render.FRONTEND_URL,render.RENDER_EXTERNAL_URL);
  assert.throws(()=>validarProducao({...render,FRONTEND_URL:'',RENDER_EXTERNAL_URL:'http://inseguro.example'}));
  assert.doesNotThrow(()=>validarProducao({...config,IMAGE_STORAGE:'database',FIREBASE_STORAGE_BUCKET:''}));
  for(const extra of [{IMAGE_STORAGE:''},{IMAGE_STORAGE:'desconhecido'},{FIREBASE_STORAGE_BUCKET:''}])assert.throws(()=>validarProducao({...config,...extra}));
  for(const extra of [{FRONTEND_URL:'http://conectafit.example'},{FRONTEND_URL:'https://conectafit.example/caminho'},{FRONTEND_URLS:'https://*.example'},{DB_HOST:'db.example',DB_SSL:'false'},{DEMO_PASSWORD:'teste'},{VITE_API_URL:'https://outra.example/api'}])assert.throws(()=>validarProducao({...config,...extra}));
  assert.equal(nomeCookie(true),'__Host-conectafit');
});

test('seguranca integrada: recuperacao concorrente, revogacao, JWT e isolamento', async t => {
  const app = await servidorIsolado();
  try {
    const senha = 'SenhaInicial!2026', novaSenha = 'NovaSenha!2026';
    const senhaHash = await bcrypt.hash(senha, 12);
    for (const [id, perfil] of [[1,'aluno'],[2,'aluno'],[3,'personal'],[4,'nutri'],[5,'academia'],[6,'academia']]) {
      await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,$4,$5)`, [id,`Pessoa ${id}`,`seg${id}@example.invalid`,senhaHash,perfil]);
    }
    const tokens = Object.fromEntries(await Promise.all([1,2,3,4,5,6].map(async id => [id,await app.token(id)])));
    const api = async (url, method='GET', body, token=tokens[1]) => {
      const r = await fetch(app.base+'/api'+url,{method,headers:{'Content-Type':'application/json','X-ConectaFit-Request':'1',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      return {status:r.status,data:await r.json(),headers:r.headers,token:r.headers.get('set-cookie')?.match(/conectafit_sessao=([a-f0-9]{64})/)?.[1]};
    };
    await t.test('tokens ausentes, falsos, expirados e perfil adulterado', async () => {
      assert.equal((await api('/usuario/me','GET',undefined,null)).status,401);
      const payload = {id:1,email:'seg1@example.invalid',tipo_usuario:'academia'};
      assert.equal((await api('/usuario/me','GET',undefined,jwt.sign(payload,'chave-incorreta'))).status,401);
      assert.equal((await api('/usuario/me','GET',undefined,jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:-1}))).status,401);
      assert.equal((await api('/usuario/me','GET',undefined,jwt.sign(payload,process.env.JWT_SECRET,{algorithm:'HS384'}))).status,401);
      assert.equal((await api('/academia/dashboard','GET',undefined,jwt.sign(payload,process.env.JWT_SECRET))).status,401);
      const me=await api('/usuario/me');assert.equal(me.headers.get('cache-control'),'no-store');assert.equal(me.data.senha_hash,undefined);
    });
    await t.test('treinos, evolucao e financeiro nao atravessam contas', async () => {
      const ficha={titulo:'Treino privado',exercicios:[{nome:'Agachamento',catalogo_id:'wger:75',series:3,repeticoes:'10'}],usuario_id:2};
      const criado=await api('/treinos','POST',ficha);assert.equal(criado.status,201);assert.equal(String(criado.data.treino.usuario_id),'1');
      assert.equal((await api(`/treinos/${criado.data.treino.id}`,'PUT',ficha,tokens[2])).status,404);
      assert.equal((await api(`/treinos/${criado.data.treino.id}`,'DELETE',undefined,tokens[2])).status,404);
      assert.equal((await api('/evolucao/profissional/1','GET',undefined,tokens[3])).status,403);
      assert.equal((await api('/evolucao/profissional/1','GET',undefined,tokens[4])).status,403);
      assert.equal((await api('/operacao-academia/financeiro?unidade=5&inicio=2026-01-01&fim=2026-12-31','GET',undefined,tokens[6])).status,403);
      await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(5,3,'recepcao',true)`);
      assert.equal((await api('/operacao-academia/financeiro?unidade=5&inicio=2026-01-01&fim=2026-12-31','GET',undefined,tokens[3])).status,403);
      assert.equal((await api('/demonstracoes/999/video','GET',undefined,tokens[2])).status,404);
    });
    await t.test('cookie HttpOnly, CSRF e logout revogavel por dispositivo', async () => {
      const sessao=await app.token(2),outra=await app.token(2);
      const cookie=`conectafit_sessao=${sessao}`;
      const chamar=(path,headers={})=>fetch(app.base+'/api'+path,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json',...headers},body:'{}'});
      assert.equal((await chamar('/logout')).status,403);
      assert.equal((await chamar('/logout',{'X-ConectaFit-Request':'1',Origin:'https://intruso.example'})).status,403);
      assert.equal((await chamar('/logout',{'X-ConectaFit-Request':'1',Origin:'null'})).status,403);
      assert.equal((await api('/usuario/me','GET',undefined,sessao)).status,200);
      const saida=await chamar('/logout',{'X-ConectaFit-Request':'1'});assert.equal(saida.status,200);assert.match(saida.headers.get('set-cookie'),/HttpOnly/);
      assert.equal((await api('/usuario/me','GET',undefined,sessao)).status,401);
      assert.equal((await api('/usuario/me','GET',undefined,outra)).status,200);
      assert.equal((await chamar('/logout',{'X-ConectaFit-Request':'1'})).status,200);
      await app.db.query(`UPDATE ${app.schema}.sessoes_conta SET expira_em=NOW()-INTERVAL '1 second' WHERE token_hash=$1`,[crypto.createHash('sha256').update(outra).digest('hex')]);
      assert.equal((await api('/usuario/me','GET',undefined,outra)).status,401);
    });
    await t.test('cookie de producao usa Secure e hash no banco',async()=>{
      const c=await app.db.connect();await c.query(`SET search_path TO ${app.schema}`);
      const banco={connect:async()=>({query:(...a)=>c.query(...a),release:()=>{}})};let gravado;
      try{
        await criarSessao(banco,{id:2,versao_sessao:0},{headers:{}},{cookie:(nome,valor,opcoes)=>{gravado={nome,valor,opcoes};}},true);
        assert.equal(gravado.nome,'__Host-conectafit');assert.equal(gravado.opcoes.httpOnly,true);assert.equal(gravado.opcoes.secure,true);assert.equal(gravado.opcoes.sameSite,'lax');assert.equal(gravado.opcoes.path,'/');assert.equal(gravado.opcoes.domain,undefined);
        const row=(await c.query('SELECT token_hash FROM sessoes_conta WHERE token_hash=$1',[hashSessao(gravado.valor)])).rows[0];assert.ok(row);assert.notEqual(row.token_hash,gravado.valor);
      }finally{await c.query('RESET search_path');c.release();}
    });
    await t.test('cadastro rejeita senha acima do limite real do bcrypt', async () => {
      assert.equal((await api('/cadastro','POST',{nome:'Pessoa teste',email:'novo@example.invalid',tipo_usuario:'aluno',senha:'a'.repeat(73)},null)).status,400);
    });
    await t.test('apenas um link concorrente funciona; sessoes e outros links sao revogados', async () => {
      const login=await api('/login','POST',{email:'seg1@example.invalid',senha,tipo_usuario:'aluno'},null);
      assert.equal(login.status,200);assert.equal(login.data.token,undefined);assert.ok(login.token);assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Lax/);
      const links=[crypto.randomBytes(32).toString('hex'),crypto.randomBytes(32).toString('hex')];
      for(const token of links)await app.db.query(`INSERT INTO ${app.schema}.recuperacoes_senha(usuario_id,token_hash,expira_em) VALUES(1,$1,NOW()+INTERVAL '30 minutes')`,[crypto.createHash('sha256').update(token).digest('hex')]);
      const resultados=await Promise.all(links.map(token=>api('/senha/redefinir','POST',{token,senha:novaSenha},null)));
      assert.deepEqual(resultados.map(r=>r.status).sort(),[200,400]);
      assert.equal((await api('/senha/redefinir','POST',{token:links[0],senha:'OutraSenha!2026'},null)).status,400);
      assert.equal((await api('/usuario/me','GET',undefined,login.token)).status,401);
      assert.equal((await api('/usuario/me')).status,401); // Sessao anterior tambem e revogada.
      assert.equal((await api('/usuario/me','GET',undefined,tokens[2])).status,200);
      assert.equal((await api('/login','POST',{email:'seg1@example.invalid',senha,tipo_usuario:'aluno'},null)).status,401);
      const novo=await api('/login','POST',{email:'seg1@example.invalid',senha:novaSenha,tipo_usuario:'aluno'},null);
      assert.equal(novo.status,200);assert.equal((await api('/usuario/me','GET',undefined,novo.token)).status,200);
      const pendentes=await app.db.query(`SELECT count(*)::int AS n FROM ${app.schema}.recuperacoes_senha WHERE usuario_id=1 AND usado_em IS NULL`);assert.equal(pendentes.rows[0].n,0);
    });
  } finally { await app.fechar(); }
});
