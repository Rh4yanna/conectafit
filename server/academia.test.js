import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {servidorIsolado} from '../scripts/teste-servidor-isolado.mjs';
import {hojeEvolucao} from './evolucao.js';
test('academia: contratos, financeiro concorrente, equipe, importação, presença e vagas isolados',async()=>{
 const app=await servidorIsolado();try{
 for(const [id,tipo] of [[1,'academia'],[2,'academia'],[3,'aluno'],[4,'personal'],[5,'aluno']])await app.db.query(`INSERT INTO ${app.schema}.usuarios(id,nome,email,senha_hash,tipo_usuario) VALUES($1,$2,$3,'teste',$4)`,[id,`Pessoa ${id}`,`p${id}@example.invalid`,tipo]);
 const tokens=Object.fromEntries(await Promise.all([1,2,3,4,5].map(async id=>[id,await app.token(id)])));
 async function req(path,method='GET',body,id=1,unidade=1){const r=await fetch(app.base+'/api/operacao-academia'+path+(path.includes('?')?'&':'?')+'unidade='+unidade,{method,headers:{Authorization:`Bearer ${tokens[id]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();return {status:r.status,data:d};}
 async function ok(path,method='GET',body,id=1){const r=await req(path,method,body,id);assert.ok(r.status<300,JSON.stringify({path,...r}));return r.data;}
 const inicio=hojeEvolucao().slice(0,7)+'-01',hoje=hojeEvolucao(),competencia=inicio.slice(0,7);
 let plano=await ok('/planos','POST',{nome:'Essencial',valor:100,duracao_meses:1,servicos:'Sala de musculação',modalidades:'Musculação',condicoes:'Pagamento mensal',ativo:true});
 let m=await ok('/matriculas','POST',{nome:'Aluno de teste',email:'aluno@example.invalid'});
 m=await ok(`/matriculas/${m.id}/contrato`,'POST',{versao:m.versao,plano_id:plano.id,inicio,dia_vencimento:10,motivo:'Contratação inicial'});
 const getM=async()=> (await ok('/matriculas')).find(x=>x.id===m.id);
 assert.equal((await getM()).ciclos.length,1);
 plano=await ok('/planos','POST',{...plano,valor:150,motivo:'Novo valor'});
 assert.equal((await getM()).contrato.valor,'100.00');
 const proximo=new Date(Date.parse(m.termino)+86400000).toISOString().slice(0,10);
 m=await ok(`/matriculas/${m.id}/contrato`,'POST',{versao:m.versao,plano_id:plano.id,inicio:proximo,dia_vencimento:10,motivo:'Renovação antecipada',renovar:true});
 assert.equal((await ok('/planos')).find(p=>p.id===plano.id).alunos_ativos,1);
 const futuro=await ok('/planos','POST',{nome:'Plano futuro',valor:200,duracao_meses:3,servicos:'Sala',modalidades:'Treino',condicoes:'Mensal',ativo:true});
 const futuraMatricula=await ok('/matriculas','POST',{nome:'Aluno futuro',email:'futuro@example.invalid'});
 await ok(`/matriculas/${futuraMatricula.id}/contrato`,'POST',{versao:futuraMatricula.versao,plano_id:futuro.id,inicio:proximo,dia_vencimento:10,motivo:'Contrato futuro'});
 assert.equal((await ok('/planos')).find(p=>p.id===futuro.id).alunos_ativos,0);
 assert.equal((await req('/planos','GET',null,2,1)).status,403);
 assert.equal((await getM()).inicio,inicio);assert.equal((await getM()).ciclos.length,2);
 const mensalidade=await ok(`/matriculas/${m.id}/mensalidades`,'POST',{competencia});assert.equal(Number(mensalidade.valor),100);
 assert.equal((await req(`/matriculas/${m.id}/mensalidades`,'POST',{competencia})).status,409);
 const pagamento={valor:40,data:hoje,chave_cliente:crypto.randomUUID()};const concorrentes=await Promise.all([req(`/mensalidades/${mensalidade.id}/pagamento`,'POST',pagamento),req(`/mensalidades/${mensalidade.id}/pagamento`,'POST',pagamento)]);assert.ok(concorrentes.every(r=>r.status===200));assert.equal(concorrentes[0].data.id,concorrentes[1].data.id);
 await ok(`/mensalidades/${mensalidade.id}/desconto`,'POST',{valor:10,motivo:'Desconto negociado'});assert.equal(Number((await ok('/mensalidades'))[0].saldo),50);
 assert.equal((await req(`/mensalidades/${mensalidade.id}/pagamento`,'POST',{valor:51,data:hoje,chave_cliente:crypto.randomUUID()})).status,400);
 await ok(`/mensalidades/${mensalidade.id}/pagamento`,'POST',{valor:50,data:hoje,chave_cliente:crypto.randomUUID()});assert.equal((await ok('/mensalidades'))[0].status,'quitada');
 await ok(`/lancamentos/${concorrentes[0].data.id}/estorno`,'POST',{data:hoje,motivo:'Pagamento lançado por engano'});assert.equal(Number((await ok('/mensalidades'))[0].saldo),40);
 assert.equal((await req(`/lancamentos/${concorrentes[0].data.id}/estorno`,'POST',{data:hoje,motivo:'Repetido'})).status,409);
 const manual={tipo:'despesa',descricao:'Manutenção',categoria:'manutencao',valor:20,data:hoje,chave_cliente:crypto.randomUUID()};await ok('/lancamentos','POST',manual);assert.equal((await req('/lancamentos','POST',{...manual,chave_cliente:crypto.randomUUID()})).status,409);
 const financeiro=await ok(`/financeiro?inicio=${inicio}&fim=${m.termino.slice(0,10)}`);assert.equal(Number(financeiro.resumo.recebido),50);assert.equal(financeiro.lancamentos.length,4);
 await ok('/equipe','POST',{email:'p3@example.invalid',papel:'recepcao',ativo:true,motivo:'Recepção'});await ok('/equipe','POST',{email:'p4@example.invalid',papel:'professor',ativo:true,motivo:'Professor'});
 assert.equal((await req('/mensalidades','GET',null,3)).status,403);assert.equal((await req('/historico','GET',null,3)).status,403);assert.equal((await req('/planos','GET',null,4)).status,403);assert.equal((await req('/matriculas','POST',{nome:'Teste pessoa',email:'teste@invalid.com'},4)).status,403);
 const visivel=(await ok('/matriculas','GET',null,3))[0];assert.equal(visivel.valor_mensal,undefined);assert.equal(visivel.contrato,undefined);assert.equal(visivel.ciclos,undefined);
 assert.equal((await req('/matriculas','GET',null,2,1)).status,403);assert.equal((await req(`/matriculas/${m.id}`,'PATCH',{situacao:'trancada',motivo:'Teste',versao:m.versao},2,2)).status,404);
 const presenca=await ok('/presencas','POST',{matricula_id:m.id,data:hoje},4);assert.equal((await req('/presencas','POST',{matricula_id:m.id,data:hoje},4)).status,409);
 let frequencia=await ok(`/acompanhamento?inicio=${inicio}&fim=${hoje}`, 'GET',null,4);assert.equal(frequencia[0].frequencia,1);await ok('/contatos','POST',{matricula_id:m.id,motivo:'Acolhimento',relato:'Conversa realizada',proximo_contato:hoje},4);
 await ok(`/presencas/${presenca.id}`,'DELETE',{motivo:'Data incorreta'},4);frequencia=await ok(`/acompanhamento?inicio=${inicio}&fim=${hoje}`);assert.equal(frequencia[0].frequencia,0);
 const aulaInicio=new Date(Date.now()+86400000),aulaFim=new Date(+aulaInicio+3600000);
 const turma=await ok('/turmas','POST',{nome:'Turma teste',local:'Sala A',professor:'Professor Um',inicio:aulaInicio.toISOString(),fim:aulaFim.toISOString(),vagas:1});
 assert.equal((await req('/turmas','POST',{nome:'Outra',local:'Sala A',professor:'Professor Dois',inicio:aulaInicio.toISOString(),fim:aulaFim.toISOString(),vagas:2})).status,409);
 const m2=await ok('/matriculas','POST',{nome:'Segundo aluno',email:'segundo@example.invalid'});const reservas=await Promise.all([req(`/turmas/${turma.id}/reservas`,'POST',{matricula_id:m.id}),req(`/turmas/${turma.id}/reservas`,'POST',{matricula_id:m2.id})]);assert.deepEqual(reservas.map(r=>r.status).sort(),[200,409]);
 const previa=await ok('/importacoes/previa','POST',{conteudo:JSON.stringify([{nome:'Aluno repetido',email:'aluno@example.invalid'},{nome:'Novo importado',email:'novo@example.invalid'},{nome:'Mesmo importado',email:'NOVO@example.invalid'}])});assert.equal(previa.registros.filter(x=>x.duplicado).length,2);assert.equal((await req(`/importacoes/${previa.id}/confirmar`,'POST',{revisado:false})).status,400);const imp=await ok(`/importacoes/${previa.id}/confirmar`,'POST',{revisado:true});assert.equal(imp.importados,1);assert.deepEqual(await ok(`/importacoes/${previa.id}/confirmar`,'POST',{revisado:true}),imp);
 const convite=await ok('/convites','POST',{});await ok(`/convites/${convite.token}/aceitar`,'POST',{},5);assert.equal((await ok('/matriculas')).find(x=>x.aluno_email==='p5@example.invalid').situacao,'inativa');assert.equal((await req(`/convites/${convite.token}/aceitar`,'POST',{},3)).status,409);
 await ok('/estrutura','PUT',{ambientes:'Sala ampla',equipamentos:'Pesos livres',horarios:'Segunda a sexta',acessibilidade:'Rampa'});
 const pub=await fetch(app.base+'/api/servicos/academia/1',{headers:{Authorization:`Bearer ${tokens[5]}`}});assert.equal(pub.status,200);const publico=await pub.json();assert.equal(publico.planos_comerciais[0].valor,150);assert.equal(publico.estrutura.ambientes,'Sala ampla');
 m=await getM();await ok(`/matriculas/${m.id}`,'PATCH',{versao:m.versao,situacao:'trancada',motivo:'Viagem do aluno'});assert.equal((await req('/presencas','POST',{matricula_id:m.id,data:hoje},4)).status,400);assert.equal((await req(`/matriculas/${m.id}`,'PATCH',{versao:m.versao,situacao:'ativa',motivo:'Reenvio antigo'})).status,409);m=await getM();await ok(`/matriculas/${m.id}`,'PATCH',{versao:m.versao,situacao:'cancelada',motivo:'Encerramento solicitado'});assert.equal((await getM()).situacao,'cancelada');
 const historico=await ok(`/historico?entidade=matricula&id=${m.id}`);assert.ok(historico.some(h=>h.acao==='renovar'&&String(h.autor_id)==='1'));
 await ok('/equipe','POST',{email:'p3@example.invalid',papel:'recepcao',ativo:false,motivo:'Fim do acesso'});assert.equal((await req('/matriculas','GET',null,3)).status,403);
 }finally{await app.fechar();}
});
