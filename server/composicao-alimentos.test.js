import test from 'node:test';
import assert from 'node:assert/strict';
import {compararAlimentos} from '../src/utils/composicao-alimentos.js';
test('comparação TACO preserva nutrientes, ausências e exige massa e restrições explícitas',()=>{
 const r=compararAlimentos({id:1,quantidade:100,unidade:'g'});
 const arroz=r.alternativas.find(a=>a.id===3);
 assert.ok(Math.abs(arroz.gramas-100*25.8/28.1)<1e-9);
 assert.ok(Math.abs(arroz.nutrientes.carboidrato-25.8)<1e-9);
 assert.notEqual(arroz.nutrientes.kcal,r.original.nutrientes.kcal);
 assert.throws(()=>compararAlimentos({id:1,quantidade:1,unidade:'unidade'}));
 assert.throws(()=>compararAlimentos({id:1,quantidade:100,unidade:'g',restricao:'alergia'}));
 assert.throws(()=>compararAlimentos({id:1,quantidade:-1,unidade:'g'}));
 assert.equal(compararAlimentos({id:260,quantidade:10,unidade:'ml',massaGramas:9}).original.nutrientes.proteina,null);
});
