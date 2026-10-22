import test from 'node:test';
import assert from 'node:assert/strict';
import {validarCPF,validarRegras,motivoBloqueio} from './academia-regras.js';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('CPF e limites de acesso',()=>{
 assert.equal(validarCPF('529.982.247-25'),'52998224725');assert.throws(()=>validarCPF('11111111111'));assert.throws(()=>validarCPF('52998224724'));assert.equal(validarCPF(''),null);
 const r=validarRegras({dias_semana:'1,2',hora_inicio:'08:00',hora_fim:'18:00',limite_diario:'1'});
 assert.equal(motivoBloqueio(r,1,'08:00',0),null);assert.ok(motivoBloqueio(r,0,'09:00',0));assert.ok(motivoBloqueio(r,1,'18:00',0));assert.ok(motivoBloqueio(r,1,'09:00',1));assert.throws(()=>validarRegras({hora_inicio:'22:00',hora_fim:'06:00'}));
});
test('cadastro com CPF e regras contratuais aplicadas na entrada',async()=>{
 const app=await servidorIsolado();try{
  for(const [id,tipo]of [[1,'academia'],[2,'personal']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,'Pessoa',$2,'teste',$3)`,[id,`${id}@teste.invalid`,tipo]);
  await app.db.query(`INSERT INTO ${app.schema}.equipe_academia(academia_id,usuario_id,papel,ativo) VALUES(1,2,'professor',true)`);
  const tokens={1:await app.token(1),2:await app.token(2)};
  async function req(path,method='GET',body,id=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade=1',{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,d:await r.json()};}
  const b={nome:'Aluno teste',email:'aluno@teste.invalid',cpf:'529.982.247-25'};
  const m=(await req('/matriculas','POST',b)).d;assert.equal(m.cpf,'52998224725');assert.equal((await req('/matriculas','POST',{...b,email:'outro@teste.invalid'})).status,409);assert.equal((await req('/matriculas','GET',null,2)).d[0].cpf,undefined);
  assert.equal((await req('/importacoes/previa','POST',{conteudo:JSON.stringify([{nome:'Invalido',email:'invalido@teste.invalid',cpf:'11111111111'}])})).status,400);
  assert.equal((await req('/importacoes/previa','POST',{conteudo:'[]'},2)).status,403);
  const previa=(await req('/importacoes/previa','POST',{conteudo:JSON.stringify([
   {nome:'CPF existente',email:'duplicado@teste.invalid',cpf:b.cpf},
   {nome:'Importado',email:'importado@teste.invalid',cpf:'111.444.777-35'},
   {nome:'CPF repetido',email:'repetido@teste.invalid',cpf:'11144477735'},
   {nome:'Sem CPF',email:'semcpf@teste.invalid'}
  ])})).d;
  assert.deepEqual(previa.registros.map(x=>x.duplicado),[true,false,true,false]);
  const importar=()=>req(`/importacoes/${previa.id}/confirmar`,'POST',{revisado:true});
  const importado=await importar();assert.equal(importado.status,200);assert.equal(importado.d.importados,2);assert.deepEqual((await importar()).d,importado.d);
  assert.equal((await req('/matriculas')).d.find(x=>x.aluno_email==='importado@teste.invalid').cpf,'11144477735');
  const concorrente=(await req('/importacoes/previa','POST',{conteudo:JSON.stringify([{nome:'Concorrente',email:'concorrente@teste.invalid',cpf:'12345678909'}])})).d;
  assert.equal((await req('/matriculas','POST',{nome:'Criado depois',email:'depois@teste.invalid',cpf:'12345678909'})).status,201);
  assert.equal((await req(`/importacoes/${concorrente.id}/confirmar`,'POST',{revisado:true})).d.ignorados,1);
  let p=(await req('/planos','POST',{nome:'Controlado',valor:100,duracao_meses:1,servicos:'Sala',modalidades:'Musculação',condicoes:'Mensal',ativo:true,limite_diario:'1'})).d;assert.equal(p.regras_acesso.limite,1);
  await req(`/matriculas/${m.id}/contrato`,'POST',{versao:m.versao,plano_id:p.id,inicio:hojeEvolucao(),dia_vencimento:10,motivo:'Contrato'});
  const entrada=await req('/fluxo/entrada','POST',{matricula_id:m.id});assert.equal(entrada.status,201);await req(`/fluxo/${entrada.d.id}/saida`,'POST',{});
  p=(await req('/planos','POST',{...p,limite_diario:'3',motivo:'Novo catálogo'})).d;assert.equal(p.regras_acesso.limite,3);
  const bloqueio=await req('/fluxo/entrada','POST',{matricula_id:m.id});assert.equal(bloqueio.status,409);assert.match(bloqueio.d.message,/limite diário/);
  assert.equal((await req('/matriculas')).d.find(x=>x.id===m.id).ciclos[0].contrato.regras_acesso.limite,1);
 }finally{await app.fechar();}
});
