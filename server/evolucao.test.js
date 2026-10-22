import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validarObjetivo,calcularObjetivo,dataValida,hojeEvolucao } from './evolucao.js';
import { servidorIsolado } from '../scripts/teste-servidor-isolado.mjs';

test('metas validam datas, etapas progressivas e usam apenas registros dentro dos prazos',()=>{
  const o={titulo:'Constância',indicador:'treinos',direcao:'aumentar',alvo:3,inicio:'2026-01-01',prazo:'2026-01-31',status:'ativo',etapas:[{titulo:'Primeira etapa',alvo:1,prazo:'2026-01-10'}]};
  assert.doesNotThrow(()=>validarObjetivo(o));
  for(const b of [{...o,prazo:'2025-12-31'},{...o,alvo:0},{...o,indicador:'aluno_id'},{...o,direcao:'reduzir'},{...o,etapas:[{titulo:'X',alvo:4,prazo:'2026-01-10'}]},{...o,etapas:[{titulo:'X',alvo:2,prazo:'2026-01-10'},{titulo:'Y',alvo:1,prazo:'2026-01-11'}]}])assert.throws(()=>validarObjetivo(b));
  assert.equal(dataValida('2026-02-30'),false);assert.equal(dataValida('2999-01-01',true),false);
  const fontes={treinos:[{data:'2025-12-31',valor:50},{data:'2026-01-05',valor:1},{data:'2026-01-20',valor:1},{data:'2026-02-01',valor:30}],medidas:[]};
  const r=calcularObjetivo(o,fontes,'2026-02-10');assert.equal(r.progresso.valor,2);assert.equal(r.progresso.percentual,67);assert.equal(r.progresso.atrasada,true);assert.equal(r.etapas[0].progresso.valor,1);assert.equal(r.etapas[0].progresso.atingida,true);
  const peso={...o,indicador:'peso',direcao:'reduzir',alvo:78,etapas:[]};fontes.medidas=[{data:'2025-12-31',peso:'80'},{data:'2026-01-10',peso:'79'},{data:'2026-02-02',peso:'77'}];
  assert.equal(calcularObjetivo(peso,fontes,'2026-02-10').progresso.percentual,50);
  fontes.medidas=[];assert.equal(calcularObjetivo(peso,fontes,'2026-02-10').progresso.valor,null);
});

test('API real: hidratação, revisões, gráficos, progresso e comentários com permissões separadas',async()=>{
  const app=await servidorIsolado();try{
    await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES(1,'Aluno','aluno@example.invalid','teste','aluno'),(2,'Outro','outro@example.invalid','teste','aluno'),(3,'Nutri','nutri@example.invalid','teste','nutri'),(4,'Personal','personal@example.invalid','teste','personal')`);
    await app.db.query(`INSERT INTO ${app.schema}.conexoes_nutri(nutri_id,aluno_id,status,ativo,permite_medidas,permite_fotos,permite_metas) VALUES(3,1,'aceito',TRUE,TRUE,FALSE,TRUE)`);
    await app.db.query(`INSERT INTO ${app.schema}.conexoes_alunos(personal_id,aluno_id,status,ativo,permite_medidas,permite_fotos,permite_metas) VALUES(4,1,'aceito',TRUE,FALSE,TRUE,FALSE)`);
    const emails={1:'aluno',2:'outro',3:'nutri',4:'personal'},tokens=Object.fromEntries(await Promise.all(Object.entries(emails).map(async ([id])=>[id,await app.token(Number(id))])));
    const api=async(path,method='GET',body,usuario=1)=>{const r=await fetch(`${app.base}/api${path}`,{method,headers:{Authorization:`Bearer ${tokens[usuario]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
    const hoje=hojeEvolucao();
    const body={data:hoje,horario:'10:00',quantidade_ml:250,chave_cliente:crypto.randomUUID()};
    const vezes=await Promise.all([api('/evolucao/hidratacao','POST',body),api('/evolucao/hidratacao','POST',body)]);assert.deepEqual(vezes.map(r=>r.status).sort(),[200,201]);let agua=vezes[0].data;
    assert.equal((await api('/evolucao/hidratacao')).data.total_ml,250);assert.equal((await api('/evolucao/hidratacao','GET',null,2)).data.total_ml,0);
    assert.equal((await api('/evolucao/hidratacao','POST',{...body,chave_cliente:crypto.randomUUID(),data:'2026-02-30'})).status,400);
    assert.equal((await api('/evolucao/hidratacao','POST',{...body,quantidade_ml:0})).status,400);
    assert.equal((await api(`/evolucao/hidratacao/${agua.id}`,'PUT',{...body,quantidade_ml:500,versao:1},2)).status,409);
    agua=(await api(`/evolucao/hidratacao/${agua.id}`,'PUT',{...body,quantidade_ml:500,versao:1})).data;assert.equal(agua.versao,2);
    assert.equal((await api(`/evolucao/hidratacao/${agua.id}`,'PUT',{...body,versao:1})).status,409);
    assert.equal((await api('/aluno/resumo')).data.agua_atual,0.5);
    assert.equal((await api('/aluno/progresso','PUT',{agua_litros:99})).data.agua_hoje_litros,0.5);
    const inicial=await api('/evolucao/metas','PUT',{versao:0,treinos_semana:3,agua_litros:2,refeicoes_semana:14});assert.equal(inicial.status,200);assert.equal(inicial.data.versao,1);
    const revisoes=await Promise.all([api('/evolucao/metas','PUT',{...inicial.data,treinos_semana:4,motivo:'Revisão'}),api('/evolucao/metas','PUT',{...inicial.data,treinos_semana:5,motivo:'Conflito'})]);assert.deepEqual(revisoes.map(r=>r.status).sort(),[200,409]);assert.equal((await api('/evolucao/metas/revisoes')).data.length,2);
    const medida=await api('/aluno/medidas','POST',{data_medicao:hoje,peso:80,cintura:90,observacoes:'Condições habituais'});assert.equal(medida.status,201);
    assert.equal((await api('/aluno/medidas','POST',{data_medicao:'2999-01-01',peso:80})).status,400);
    const fotos=await api('/aluno/fotos','POST',{data_registro:hoje,frente_url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='});assert.equal(fotos.status,201);
    const objetivo={titulo:'Registrar água',indicador:'agua_ml',direcao:'aumentar',alvo:1000,inicio:hoje,prazo:hoje,etapas:[{titulo:'Primeiros registros',alvo:500,prazo:hoje}],status:'ativo'};
    const novo=await api('/evolucao/objetivos','POST',objetivo);assert.equal(novo.status,201,JSON.stringify(novo.data));let o=novo.data;
    let progressos=(await api('/evolucao/objetivos')).data;assert.equal(progressos[0].progresso.valor,500);assert.equal(progressos[0].progresso.percentual,50);assert.equal(progressos[0].etapas[0].progresso.atingida,true);
    const revisao=await api(`/evolucao/objetivos/${o.id}`,'PUT',{...o,alvo:1500,motivo:'Ajuste do acompanhamento'});assert.equal(revisao.status,200);o=revisao.data;
    assert.equal((await api(`/evolucao/objetivos/${o.id}/revisoes`)).data.length,2);assert.equal((await api(`/evolucao/objetivos/${o.id}/revisoes`,'GET',null,2)).status,404);
    assert.equal((await api(`/evolucao/objetivos/${o.id}`,'PUT',{...o,versao:1,motivo:'Antigo'})).status,409);
    const serie=await api(`/evolucao/serie?inicio=${hoje}&fim=${hoje}`);assert.equal(serie.status,200);assert.equal(serie.data.dias[0].agua_ml,500);assert.equal(serie.data.medidas.length,1);
    assert.equal((await api('/evolucao/serie?inicio=2020-01-01&fim=2026-01-01')).status,400);
    const nutri=await api('/evolucao/profissional/1','GET',null,3);assert.equal(nutri.status,200);assert.equal(nutri.data.medidas.length,1);assert.equal(nutri.data.fotos,undefined);assert.equal(nutri.data.objetivos.length,1);
    const personal=await api('/evolucao/profissional/1','GET',null,4);assert.equal(personal.data.fotos.length,1);assert.equal(personal.data.medidas,undefined);assert.equal(personal.data.metas,undefined);
    assert.equal((await api('/evolucao/profissional/1','GET',null,2)).status,403);
    const comentario={alvo_tipo:'medida',alvo_id:medida.data.id,comentario:'Mantenha o mesmo método de registro.',chave_cliente:crypto.randomUUID()};
    assert.equal((await api('/evolucao/profissional/1/comentarios','POST',comentario,4)).status,403);
    assert.equal((await api('/evolucao/profissional/1/comentarios','POST',{...comentario,alvo_tipo:'foto',alvo_id:fotos.data.id},3)).status,403);
    assert.equal((await api('/evolucao/profissional/1/comentarios','POST',comentario,3)).status,201);assert.equal((await api('/evolucao/profissional/1/comentarios','POST',comentario,3)).status,200);
    assert.equal((await api('/evolucao/comentarios')).data.comentarios.length,1);assert.equal((await api('/evolucao/comentarios','GET',null,2)).data.comentarios.length,0);
    await app.db.query(`UPDATE ${app.schema}.conexoes_nutri SET permite_medidas=FALSE WHERE aluno_id=1`);
    assert.equal((await api('/evolucao/profissional/1','GET',null,3)).data.medidas,undefined);assert.equal((await api('/evolucao/profissional/1','GET',null,3)).data.comentarios.length,0);
    assert.equal((await api('/evolucao/profissional/1/comentarios','POST',{...comentario,chave_cliente:crypto.randomUUID()},3)).status,403);
    assert.equal((await api('/evolucao/comentarios')).data.comentarios.length,1);
    await app.db.query(`UPDATE ${app.schema}.conexoes_nutri SET ativo=FALSE WHERE aluno_id=1`);assert.equal((await api('/evolucao/profissional/1','GET',null,3)).status,403);
    assert.equal((await api(`/evolucao/hidratacao/${agua.id}`,'DELETE',{versao:2})).status,200);assert.equal((await api('/evolucao/objetivos')).data[0].progresso.valor,0);
    await app.db.query(`INSERT INTO ${app.schema}.sessoes_treino(aluno_id,titulo,exercicios,status,finalizada_em,retomada_em) VALUES(1,'Teste','[]','concluida',NOW(),NULL),(1,'Incompleta','[]','incompleta',NOW(),NULL)`);
    await api('/alimentacao/diario','POST',{nome:'Almoço',data:hoje,status:'realizada',chave_cliente:crypto.randomUUID()});
    await api('/evolucao/objetivos','POST',{...objetivo,titulo:'Treinos',indicador:'treinos',alvo:2,etapas:[]});await api('/evolucao/objetivos','POST',{...objetivo,titulo:'Refeições',indicador:'refeicoes',alvo:2,etapas:[]});
    progressos=(await api('/evolucao/objetivos')).data;assert.equal(progressos.find(o=>o.indicador==='treinos').progresso.valor,1);assert.equal(progressos.find(o=>o.indicador==='refeicoes').progresso.valor,1);
  }finally{await app.fechar();}
});
