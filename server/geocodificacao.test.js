import test from 'node:test';
import assert from 'node:assert/strict';
import {localizarEndereco} from './geocodificacao.js';
const endereco={rua:'Rua Teste',numero:'10',cidade:'Curitiba',estado:'PR'};
test('exige chave e endereço válido sem consultar fornecedor',async()=>{
 await assert.rejects(localizarEndereco(endereco,''),{status:503});
 await assert.rejects(localizarEndereco({...endereco,cidade:''},'teste'));
});
test('restringe ao Brasil e rejeita resultados de cidade, rua ou coordenadas inválidas',async()=>{
 const resultados=await localizarEndereco(endereco,'teste',async url=>{
  const u=new URL(url);assert.equal(u.searchParams.get('filter'),'countrycode:br');
  assert.ok(u.searchParams.get('text').includes('Rua Teste, 10'));
  return {ok:true,json:async()=>({results:[
   {result_type:'city',country_code:'br',lat:-25,lon:-49},
   {result_type:'street',country_code:'br',lat:-25,lon:-49},
   {result_type:'building',country_code:'br',lat:100,lon:-49},
   {result_type:'building',country_code:'br',lat:-25,lon:-49,formatted:'Rua Teste, 10, Curitiba'},
  ]})};
 });
 assert.deepEqual(resultados,[{latitude:-25,longitude:-49,endereco:'Rua Teste, 10, Curitiba'}]);
});
test('falhas externas não expõem chave ou URL',async()=>{
 await assert.rejects(localizarEndereco(endereco,'segredo',async()=>{throw new Error('segredo');}),e=>!e.message.includes('segredo'));
 await assert.rejects(localizarEndereco(endereco,'segredo',async()=>({ok:false})));
});
