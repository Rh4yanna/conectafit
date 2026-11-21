import {useEffect,useState} from 'react';
import {alimentacao} from './comum';
/* eslint-disable react/prop-types */
const frutas=[['Abacate',100,100],['Banana',100,100],['Melão',300,87],['Mamão',250,100],['Maracujá',100,98],['Manga',150,97],['Maçã',200,106],['Uva',200,98],['Abacaxi',200,96],['Pêssego',180,104],['Laranja',160,100],['Morango',300,90],['Pera',200,100],['Romã',200,100],['Carambola',225,100],['Caqui',140,100],['Kiwi',215,100],['Frutas vermelhas',210,100],['Melancia',300,100]];
const grupos={
 frutas:frutas.map(([nome])=>nome),
 proteinas:['Ovo','Peito de frango','Carne magra','Patinho moído','Peixe','Atum','Ovos'],
 carboidratos:['Arroz','Pão','Aveia','Farinha de arroz','Batata inglesa','Batata-doce','Macarrão','Mandioca','Cuscuz','Tapioca','Torrada integral','Creme de arroz','Pão integral'],
 laticinios:['Queijo mussarela','Iogurte','Leite','Queijo branco','Iogurte natural','Ricota','Coalhada'],
 vegetais:['Legumes','Salada','Brócolis','Cenoura','Abobrinha','Alface','Tomate','Couve-flor'],
 suplementos:['Whey protein','Leite em pó','Iogurte','Ovos','Queijo branco','Frango','Leite'],
 doces:['Bis','Doce de leite','Chocolate','Geleia','Mel','Frutas','Iogurte']
};
const extras=['Ovo','Pão','Queijo mussarela','Bis','Arroz','Peito de frango','Carne magra','Legumes','Salada','Whey protein','Iogurte','Aveia','Farinha de arroz','Banana','Doce de leite'];
const grupo=nome=>{const n=nome.toLocaleLowerCase('pt-BR');if(n.includes('fruta'))return 'frutas';if(n.includes('frango')||n.includes('carne')||n.includes('ovo'))return 'proteinas';if(n.includes('whey'))return 'suplementos';if(n.includes('queijo')||n.includes('iogurte'))return 'laticinios';if(n.includes('legume')||n.includes('salada'))return 'vegetais';if(n.includes('bis')||n.includes('doce'))return 'doces';return Object.keys(grupos).find(g=>grupos[g].some(x=>x.toLocaleLowerCase('pt-BR')===n))||'carboidratos';};
export default function SugestoesAlimentos({planos,onAtualizar}){
 const plano=planos.find(p=>p.vigente)||planos[0],alimentos=plano?[...new Set(plano.refeicoes.flatMap(r=>(r.alimentos||[]).map(a=>a.nome)))]:[];
 const [selecionado,setSelecionado]=useState(''),[salvas,setSalvas]=useState([]),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false);
 useEffect(()=>{if(!plano)return;let ativo=true;alimentacao(`/planos/${plano.id}/substituicoes`).then(d=>{if(ativo)setSalvas(d);}).catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};},[plano]);
 const escolha=selecionado||alimentos[0]||extras[0],opcoes=[...new Set([...alimentos,...extras,...frutas.map(f=>f[0])])],candidatos=grupos[grupo(escolha)].filter(v=>v.toLocaleLowerCase('pt-BR')!==escolha.toLocaleLowerCase('pt-BR')).slice(0,10),atual=salvas.find(s=>s.original===escolha);
 const salvar=async nome=>{if(!plano)return;setOcupado(true);setErro('');try{const r=await alimentacao(`/planos/${plano.id}/substituicoes`,'PUT',{original:escolha,escolhida:nome});setSalvas(v=>[...v.filter(x=>x.id!==r.id),r]);onAtualizar?.();}catch(e){setErro(e.message);}finally{setOcupado(false);}};
 return <section className="border border-neutral-500/25 rounded-2xl p-5 space-y-3"><h3 className="font-bold text-lg">Sugestões de alimentos</h3><p className="text-sm">Sugestões pendentes de validação nutricional. A seleção não altera o plano original e não significa equivalência de calorias ou nutrientes. Confira com seu nutricionista.</p><label className="block">Alimento<select className="block w-full mt-1 rounded-xl border border-neutral-500/30 bg-transparent p-3" value={escolha} onChange={e=>setSelecionado(e.target.value)}>{opcoes.map(nome=><option key={nome}>{nome}</option>)}</select></label>{!plano&&<p>Cadastre um plano para guardar escolhas.</p>}{atual&&<p className="text-sm">Escolha salva: <strong>{atual.escolhida}</strong> · quantidade a validar. {!alimentos.includes(escolha)&&'Este alimento não consta no plano atual.'}</p>}{erro&&<p role="alert">{erro}</p>}<ul className="grid sm:grid-cols-2 gap-2">{candidatos.map(nome=>{const fruta=frutas.find(f=>f[0]===nome);return <li key={nome} className="border border-neutral-500/25 rounded-xl p-3"><strong>{nome}</strong><p className="text-sm">Quantidade e equivalência pendentes de validação.</p>{fruta&&<p className="text-xs">Documento: {fruta[1]} g · {fruta[2]} kcal (valor informado, não equivalência).</p>}<button className="acao-secundaria mt-2" disabled={!plano||ocupado} onClick={()=>salvar(nome)}>Selecionar {nome}</button></li>;})}</ul></section>;
}
