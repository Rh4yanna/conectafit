import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import process from 'node:process';
import express from 'express';
import pg from 'pg';
import db from './db.js';
import { prepararExercicios, rotasSessoesTreino, validarRegistro } from './sessoes-treino.js';
import { normalizarFicha, diasValidos, exercicioCatalogo, rotasBiblioteca } from './biblioteca-exercicios.js';
import { agruparEvolucao, metricas } from './progresso-treinos.js';

test('biblioteca preserva identidade e aceita apenas vínculos confiáveis', () => {
  const ficha = normalizarFicha([{nome:'nome adulterado',catalogo_id:'wger:73',series:2}]);
  assert.equal(ficha[0].nome, exercicioCatalogo('wger:73').nome);
  assert.deepEqual(normalizarFicha(ficha, ficha), ficha);
  assert.throws(() => normalizarFicha([{nome:'X',catalogo_id:'inexistente'}]));
  assert.equal(diasValidos([0,2,6]), true);
  for (const dias of [[7],[-1],[1,1],['2'],null]) assert.equal(diasValidos(dias), false);
  const series = [{carga:10,repeticoes:12,concluida:true}];
  const grupos = agruparEvolucao([{id:1,treino_id:10,exercicios:[{nome:'A',catalogo_id:'wger:73',series},{nome:'A',catalogo_id:'wger:73',series},{nome:'A',catalogo_id:'wger:75',series}]}]);
  assert.equal(grupos.length,2);
  assert.equal(grupos[0].pontos[0].volume,240);
});

test('fichas antigas inválidas não produzem séries inventadas', () => {
  for (const series of [undefined, '3x', 0, -1, 31, 2.5]) assert.throws(() => prepararExercicios([{ nome: 'Agachamento', series }]));
  assert.throws(() => prepararExercicios('{'));
  assert.equal(prepararExercicios([{ nome: 'Agachamento', series: '3' }])[0].series.length, 3);
});

test('execução valida limites, conclusão e preserva prescrição', () => {
  const origem = prepararExercicios([{ nome: 'Agachamento', series: 1, carga: '10', repeticoes: '12' }]);
  const enviados = structuredClone(origem);
  enviados[0].nome = 'Não deve substituir o nome';
  enviados[0].series[0] = { carga: 0, repeticoes: 10, concluida: true };
  assert.equal(validarRegistro(origem, enviados, 'Bom treino', 'concluida')[0].nome, 'Agachamento');
  enviados[0].series[0].carga = -1;
  assert.throws(() => validarRegistro(origem, enviados, 'Bom treino', 'concluida'));
  enviados[0].series[0] = { carga: null, repeticoes: null, concluida: false };
  assert.throws(() => validarRegistro(origem, enviados, 'Bom treino', 'concluida'));
  assert.doesNotThrow(() => validarRegistro(origem, enviados, 'Interrompido', 'incompleta'));
});

test('integração PostgreSQL: concorrência, isolamento, retomada e histórico imutável', async () => {
  // Todas as tabelas e registros de teste ficam num schema aleatório isolado.
  const schema = `teste_sessoes_${crypto.randomBytes(8).toString('hex')}`;
  let pool, server;
  try {
    await db.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ ...db.options, password: process.env.DB_PASSWORD, options: `-c search_path=${schema}` });
    await pool.query('CREATE TABLE usuarios(id BIGINT PRIMARY KEY); CREATE TABLE treinos(id BIGINT PRIMARY KEY,usuario_id BIGINT,titulo VARCHAR(120),exercicios JSONB); INSERT INTO usuarios VALUES(1),(2)');
    await pool.query(await fs.readFile(new URL('./migrations/014_sessoes_treino.sql', import.meta.url), 'utf8'));
    await pool.query(await fs.readFile(new URL('./migrations/052_feedbacks_personal.sql', import.meta.url), 'utf8'));
    await pool.query('INSERT INTO treinos VALUES(10,1,$1,$2),(20,2,$1,$2)', ['Ficha original', JSON.stringify([{ nome: 'Supino com halteres', catalogo_id:'wger:75', series: 2, repeticoes: '12', carga: '10 kg' }])]);
    await pool.query(await fs.readFile(new URL('./migrations/015_programacao_treinos.sql', import.meta.url), 'utf8'));
    await pool.query('ALTER TABLE treinos ADD COLUMN arquivada boolean NOT NULL DEFAULT false, ADD COLUMN inicio_em date, ADD COLUMN fim_em date');
    await pool.query("UPDATE treinos SET dias_semana=ARRAY[EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::smallint]");
    const app = express(); app.use(express.json());
    app.use('/sessoes', (req, _res, next) => { req.usuario = { id: Number(req.headers['x-aluno'] || 1) }; next(); }, rotasSessoesTreino(pool));
    app.use('/biblioteca', rotasBiblioteca());
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/sessoes`;
    const request = async (path = '', method = 'GET', body, aluno = 1) => {
      const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'x-aluno': String(aluno) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: r.status, data: await r.json() };
    };
    assert.equal((await request('', 'POST', { treino_id: 20 })).status, 404);
    await pool.query('INSERT INTO treinos(id,usuario_id,titulo,exercicios) VALUES(99,1,$1,$2)', ['Sem video', JSON.stringify([{nome:'Movimento sem video',series:1}])]);
    const inicioSemVideo=await request('', 'POST', {treino_id:99});
    assert.equal(inicioSemVideo.status,201);
    let semVideo=inicioSemVideo.data.sessao;
    assert.equal(semVideo.exercicios[0].demonstracao,null);
    for(const status of ['pausada','em_andamento']){
      const r=await request(`/${semVideo.id}`,'PUT',{versao:semVideo.versao,status,exercicios:semVideo.exercicios,observacoes:''});
      assert.equal(r.status,200);semVideo=r.data.sessao;
    }
    semVideo.exercicios[0].series[0].concluida=true;
    const finalSemVideo=await request(`/${semVideo.id}`,'PUT',{versao:semVideo.versao,status:'concluida',exercicios:semVideo.exercicios,observacoes:'Sessão sem demonstração concluída.'});
    assert.equal(finalSemVideo.status,200);
    assert.equal((await request()).data.historico[0].exercicios[0].series[0].concluida,true);
    await pool.query('DELETE FROM sessoes_treino WHERE id=$1',[semVideo.id]);
    await pool.query('DELETE FROM treinos WHERE id=99');
    assert.equal((await request('/resumo')).data.concluidos,0);
    assert.equal((await request('/resumo')).data.treinos_hoje.length,1);
    const catalogo = await (await fetch(base.replace('/sessoes','/biblioteca?video=true&idioma=pt'))).json();
    assert.ok(catalogo.total > 0);
    assert.ok(catalogo.resultados.every(e=>e.videos.length && e.idioma==='pt'));
    const inicios = await Promise.all([request('', 'POST', { treino_id: 10 }), request('', 'POST', { treino_id: 10 })]);
    assert.deepEqual(inicios.map(r => r.status).sort(), [200, 201]);
    assert.equal(inicios[0].data.sessao.id, inicios[1].data.sessao.id);
    let s = inicios[0].data.sessao;
    const payload = (status = 'em_andamento') => ({ versao: s.versao, status, exercicios: s.exercicios, observacoes: 'Boa sessão' });
    assert.equal((await request(`/${s.id}`, 'PUT', payload(), 2)).status, 404);
    assert.equal((await request('', 'GET', null, 2)).data.ativa, null);
    assert.equal((await request(`/${s.id}`, 'PUT', payload('concluida'))).status, 400);
    await pool.query("UPDATE sessoes_treino SET retomada_em=NOW()-INTERVAL '30 seconds' WHERE id=$1", [s.id]);
    const pausa = await request(`/${s.id}`, 'PUT', payload('pausada'));
    assert.equal(pausa.status, 200, JSON.stringify(pausa.data));
    s = pausa.data.sessao;
    assert.ok(s.segundos_ativos >= 30); assert.equal(s.retomada_em, null);
    const pausada = s.segundos_ativos;
    assert.equal((await request()).data.ativa.status, 'pausada');
    assert.equal((await request('/resumo')).data.concluidos,0);
    assert.equal((await request('/resumo')).data.sessao_ativa.status,'pausada');
    s = (await request(`/${s.id}`, 'PUT', payload('em_andamento'))).data.sessao;
    assert.equal(s.segundos_ativos, pausada);
    s.exercicios[0].series.forEach(serie => Object.assign(serie, { carga: 15, repeticoes: 12, concluida: true }));
    const salvamentos = await Promise.all([request(`/${s.id}`, 'PUT', payload()), request(`/${s.id}`, 'PUT', payload())]);
    assert.deepEqual(salvamentos.map(r => r.status).sort(), [200, 409]);
    s = salvamentos.find(r => r.status === 200).data.sessao;
    for (const status of ['concluida', 'incompleta']) {
      for (const observacoes of ['', '   \n  ']) {
        const rejeitada = await request(`/${s.id}`, 'PUT', {...payload(status), observacoes});
        assert.equal(rejeitada.status, 400);
        assert.match(rejeitada.data.message, /Conte como foi/);
        assert.equal((await request()).data.ativa.versao, s.versao);
      }
    }
    await pool.query("UPDATE treinos SET titulo='Outra ficha',exercicios='[]' WHERE id=10");
    s = (await request(`/${s.id}`, 'PUT', payload('concluida'))).data.sessao;
    assert.equal(s.titulo, 'Ficha original'); assert.equal(s.exercicios[0].nome, 'Supino com halteres');
    assert.equal((await request(`/${s.id}`, 'PUT', payload())).status, 409);
    assert.equal((await request('/resumo')).data.concluidos,1);
    assert.equal((await request('/resumo')).data.treinos_hoje[0].concluido_hoje,true);
    assert.equal((await request('/evolucao')).data.exercicios[0].pontos[0].volume,360);
    await pool.query('UPDATE treinos SET exercicios=$1 WHERE id=10',[JSON.stringify([{nome:'Supino com halteres',catalogo_id:'wger:75',series:2}])]);
    const segunda = (await request('', 'POST', {treino_id:10})).data.sessao;
    assert.equal(segunda.exercicios[0].anterior.carga_maxima,15);
    assert.equal(segunda.exercicios[0].anterior.series[0].carga,15);
    assert.equal(segunda.exercicios[0].anterior.sessao_id,s.id);
    assert.equal((await request(`/${segunda.id}`, 'PUT', {versao:segunda.versao,status:'incompleta',exercicios:segunda.exercicios,observacoes:'Precisei interromper'})).status,200);
    await pool.query('DELETE FROM sessoes_treino WHERE id=$1',[segunda.id]);
    await pool.query("UPDATE sessoes_treino SET finalizada_em=(date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')-INTERVAL '1 second' WHERE id=$1",[s.id]);
    assert.equal((await request('/resumo')).data.concluidos,0);
    await pool.query("UPDATE sessoes_treino SET finalizada_em=(date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') WHERE id=$1",[s.id]);
    assert.equal((await request('/resumo')).data.concluidos,1);
    await pool.query("UPDATE sessoes_treino SET finalizada_em=((date_trunc('week',NOW() AT TIME ZONE 'America/Sao_Paulo')+INTERVAL '7 days') AT TIME ZONE 'America/Sao_Paulo') WHERE id=$1",[s.id]);
    assert.equal((await request('/resumo')).data.concluidos,0);
    await pool.query('UPDATE sessoes_treino SET finalizada_em=NOW() WHERE id=$1',[s.id]);
    await pool.query('DELETE FROM treinos WHERE id=10');
    const lista = (await request()).data;
    assert.equal(lista.ativa, null); assert.equal(lista.historico.length, 1);
    assert.equal(lista.historico[0].treino_id, null); assert.equal(lista.historico[0].exercicios[0].series[0].carga, 15);
    assert.equal((await request('?offset=-1')).status, 400);
    assert.equal((await request('', 'GET', null, 2)).data.historico.length, 0);
    await pool.query('INSERT INTO treinos(id,usuario_id,titulo,exercicios) VALUES(11,1,$1,$2)', ['Outra sessão', JSON.stringify([{ nome: 'Supino com halteres', catalogo_id:'wger:75', series: 1 }])]);
    s = (await request('', 'POST', { treino_id: 11 })).data.sessao;
    const encerrada = await request(`/${s.id}`, 'PUT', payload('incompleta'));
    assert.equal(encerrada.status, 200); assert.equal(encerrada.data.sessao.status, 'incompleta');
    assert.equal((await request()).data.historico.length, 2);
    assert.equal((await request('/resumo')).data.concluidos,1);
    assert.equal((await request('/resumo','GET',null,2)).data.concluidos,0);
    assert.equal((await request('/evolucao','GET',null,2)).data.exercicios.length,0);
    for(let i=0;i<5;i++) await pool.query("INSERT INTO sessoes_treino(aluno_id,titulo,exercicios,status,finalizada_em) VALUES(1,'Historico extra','[]','incompleta',NOW())");
    const primeira=(await request()).data;
    assert.equal(primeira.historico.length,3); assert.equal(primeira.total,7); assert.equal(primeira.temMais,true);
    assert.equal((await request('?offset=3')).data.historico.length,3);
    assert.equal((await request('/historico','DELETE',{ids:[primeira.historico[0].id]},2)).status,409);
    const ativa=(await request('', 'POST', {treino_id:11})).data.sessao;
    assert.equal((await request('/historico','DELETE',{ids:[primeira.historico[0].id,ativa.id]})).status,409);
    assert.equal((await request()).data.total,7);
    assert.equal((await request('/historico','DELETE',{ids:[primeira.historico[0].id]})).data.removidos,1);
    assert.equal((await request('/historico','DELETE',{todos:true})).data.removidos,6);
    assert.equal((await request()).data.total,0);
    assert.equal((await request()).data.ativa.id,ativa.id);

  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool?.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

test('peso e conclusao dispensam repeticoes sem inventar volume', () => {
  const origem = prepararExercicios([{nome:'Prancha',series:2,repeticoes:'30 segundos'}]);
  const enviados = structuredClone(origem);
  enviados[0].series.forEach(s => Object.assign(s, {carga:0,concluida:true}));
  const [ex] = validarRegistro(origem,enviados,'Foi tranquilo','concluida');
  assert.deepEqual(metricas(ex), {carga_maxima:0,volume:null,repeticoes:null,series:2});
  for (const status of ['concluida','incompleta'])
    for (const texto of ['', '   ', '\n\t']) assert.throws(() => validarRegistro(origem,enviados,texto,status), /Conte como foi/);
  assert.doesNotThrow(() => validarRegistro(origem,enviados,'','pausada'));
});

 test('conclui sem carga e repeticoes, mantendo feedback e limites', () => {
  const origem = prepararExercicios([{nome:'Exercicio',series:1}]);
  for (const [carga,repeticoes] of [[null,null],[10,null],[null,12]]) {
    const enviados=structuredClone(origem);
    enviados[0].series[0]={carga,repeticoes,concluida:true};
    const registro=validarRegistro(origem,enviados,'Bom treino','concluida');
    assert.deepEqual(registro[0].series[0],enviados[0].series[0]);
    assert.equal(metricas(registro[0]).series,1);
    assert.equal(metricas(registro[0]).volume,null);
    assert.throws(()=>validarRegistro(origem,enviados,'   ','concluida'));
  }
 });
