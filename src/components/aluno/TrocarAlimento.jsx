/* eslint-disable react/prop-types */
import {useEffect,useState} from 'react';
import {alimentosTaco,compararAlimentos,fonteTaco} from '../../utils/composicao-alimentos';
import {alimentosDocumento,frutasDocumento,gruposDocumento,categoriaDocumento} from '../../utils/alimentos-documento';
import {alimentacao,quantidade} from '../alimentacao/comum';

const nomes={carboidrato:'Carboidrato',proteina:'Proteína',gordura:'Gordura',frutas:'Frutas',laticinios:'Laticínios',vegetais:'Verduras e legumes',suplementos:'Suplementos',doces:'Doces'};
const numero=n=>n==null?'Não disponível':Number(n).toLocaleString('pt-BR',{maximumFractionDigits:1});
const campo='block w-full mt-1 rounded-xl border border-neutral-500/30 bg-transparent p-3';

export default function TrocarAlimento({planos,onDuvida,onAtualizar}){
 const [categoria,setCategoria]=useState('carboidrato'),[id,setId]=useState('taco:1'),[q,setQ]=useState('100'),[unidade,setUnidade]=useState('g'),[massa,setMassa]=useState(''),[restricao,setRestricao]=useState(''),[resultado,setResultado]=useState(null),[erro,setErro]=useState(''),[salvas,setSalvas]=useState([]),[ocupado,setOcupado]=useState(false);
 const plano=planos.find(p=>p.vigente)||planos[0];
 const profissionais=planos.filter(p=>p.origem==='nutricionista'&&(p.ativo||p.vigente));
 const alimentosPlano=plano?[...new Set(plano.refeicoes.flatMap(r=>(r.alimentos||[]).map(a=>a.nome)))]:[];
 const documentos=[...new Set([...alimentosPlano,...alimentosDocumento])];
 const opcoes=Object.fromEntries(Object.keys(nomes).map(cat=>[cat,[...alimentosTaco.filter(a=>a.categoria===cat).map(a=>({id:`taco:${a.id}`,nome:a.nome})),...documentos.filter(a=>categoriaDocumento(a)===cat).map(nome=>({id:`doc:${nome}`,nome}))]]));
 const alimentoDoc=id.startsWith('doc:')?id.slice(4):null;
 const frutaSelecionada=frutasDocumento.find(f=>f[0]===alimentoDoc);
 const salva=salvas.find(s=>s.original===alimentoDoc);
 useEffect(()=>{if(!plano)return;let ativo=true;alimentacao(`/planos/${plano.id}/substituicoes`).then(d=>{if(ativo)setSalvas(d);}).catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};},[plano]);
 const calcular=e=>{
  e.preventDefault();setErro('');setResultado(null);
  try{
   if(!alimentoDoc){setResultado({tipo:'taco',...compararAlimentos({id:id.slice(5),quantidade:q,unidade,massaGramas:massa,restricao})});return;}
   if(restricao!=='nenhuma')throw new Error('Com restrições alimentares, solicite orientação ao nutricionista antes de escolher uma substituição.');
   const valor=Number(q),gramas=unidade==='g'?valor:Number(massa);
   if(!Number.isFinite(valor)||valor<=0||!Number.isFinite(gramas)||gramas<=0||gramas>2000)throw new Error('Informe a quantidade e a massa comestível válida, até 2.000 g.');
   const alternativas=(gruposDocumento[categoria]||[]).filter(v=>v.toLocaleLowerCase('pt-BR')!==alimentoDoc.toLocaleLowerCase('pt-BR'));
   setResultado({tipo:'documento',alternativas});
  }catch(e){setErro(e.message);}
 };
 const salvar=async escolhida=>{
  if(!plano)return;setOcupado(true);setErro('');
  try{const r=await alimentacao(`/planos/${plano.id}/substituicoes`,'PUT',{original:alimentoDoc,escolhida});setSalvas(v=>[...v.filter(x=>x.id!==r.id),r]);onAtualizar?.();}
  catch(e){setErro(e.message);}finally{setOcupado(false);}
 };
 return <section className="space-y-5"><h2 className="text-xl font-bold">Trocar alimento</h2>
  {profissionais.map(p=><details key={p.id} open className="border border-sky-500/40 rounded-2xl p-4"><summary className="font-bold cursor-pointer">Alternativas do nutricionista · {p.titulo}</summary>{p.refeicoes.map(r=><div key={r.id} className="mt-4"><h3 className="font-semibold">{r.nome}</h3>{r.alimentos?.map((a,i)=><div key={i} className="text-sm py-2"><p>{a.nome} · {quantidade(a)}</p>{a.substituicoes?.length?<ul className="list-disc pl-5">{a.substituicoes.map((s,j)=><li key={j}>{s.nome} · {quantidade(s)}</li>)}</ul>:<p className="opacity-70">Sem alternativa aprovada para este alimento.</p>}</div>)}{p.nutri_id&&<button className="acao-secundaria" onClick={()=>onDuvida({plano_id:p.id,plano_versao:p.versao,refeicao_id:r.id,nome:r.nome,autoria:p.autoria})}>Solicitar orientação para esta refeição</button>}</div>)}</details>)}
  <div className="border border-neutral-500/25 rounded-2xl p-5 space-y-4"><h3 className="font-bold">Comparar composição</h3><p className="text-sm">As comparações com dados da TACO estimam um macronutriente, não uma equivalência nutricional completa. Para os demais alimentos, as sugestões precisam de validação.</p>
   <form onSubmit={calcular} onChange={()=>setResultado(null)} className="space-y-4"><div className="grid sm:grid-cols-2 gap-4">
    <label>Categoria<select aria-label="Categoria" className={campo} value={categoria} onChange={e=>{const cat=e.target.value;setCategoria(cat);setId(opcoes[cat][0].id);}}>{Object.entries(nomes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Alimento<select aria-label="Alimento" className={campo} value={id} onChange={e=>setId(e.target.value)}>{opcoes[categoria].map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
    <label>Quantidade<input required type="number" min="0.1" max="2000" step="0.1" className={campo} value={q} onChange={e=>setQ(e.target.value)}/></label>
    <label>Unidade<select className={campo} value={unidade} onChange={e=>setUnidade(e.target.value)}><option value="g">Gramas</option><option value="ml">Mililitros</option><option value="unidade">Unidades</option></select></label>
    {unidade!=='g'&&<label>Massa comestível total pesada (g)<input required type="number" min="0.1" max="2000" step="0.1" className={campo} value={massa} onChange={e=>setMassa(e.target.value)}/><span className="text-xs">Pese a quantidade informada.</span></label>}
    <label>Restrições relevantes<select required className={campo} value={restricao} onChange={e=>setRestricao(e.target.value)}><option value="">Selecione</option><option value="nenhuma">Não tenho restrições conhecidas</option><option value="alergia">Alergia ou intolerância</option><option value="vegetariana">Vegetarianismo ou veganismo</option><option value="clinica">Restrição clínica ou outra orientação</option></select></label>
   </div><button className="bg-sky-600 text-white rounded-xl px-5 py-3">Consultar estimativa</button></form>
   {frutaSelecionada&&<p className="text-sm">Documento: {frutaSelecionada[1]} g · {frutaSelecionada[2]} kcal. Esse valor é da porção informada, não uma equivalência.</p>}
   {salva&&<p className="text-sm">Escolha salva: <strong>{salva.escolhida}</strong> · quantidade e equivalência a validar.{!alimentosPlano.includes(alimentoDoc)&&' Este alimento não consta no plano atual.'}</p>}
   {erro&&<p role="alert">{erro}</p>}
   {resultado?.tipo==='taco'&&<div aria-live="polite" className="grid sm:grid-cols-2 gap-3">{[resultado.original,...resultado.alternativas].map((a,i)=><article key={a.id} className="border border-neutral-500/25 rounded-xl p-4 space-y-2"><p className="text-xs text-sky-500">{i?'Comparação estimada':'Porção original'}</p><h4 className="font-bold">{a.nome}</h4><strong>{numero(a.gramas)} g</strong><dl className="text-sm">{Object.entries(a.nutrientes).map(([k,v])=><div className="flex justify-between gap-2" key={k}><dt>{k==='kcal'?'Energia':nomes[k]}</dt><dd>{numero(v)}{v==null?'':k==='kcal'?' kcal':' g'}</dd></div>)}</dl><p className="text-xs opacity-70">TACO nº {a.id}, p. {a.pagina}</p></article>)}</div>}
   {resultado?.tipo==='documento'&&<div aria-live="polite" className="space-y-3"><p className="text-sm">Sugestões pendentes de validação nutricional. Não há quantidade equivalente calculada para este alimento.</p>{resultado.alternativas.map(nome=>{const fruta=frutasDocumento.find(f=>f[0]===nome);return <article key={nome} className="border border-neutral-500/25 rounded-xl p-3"><h4 className="font-bold">{nome}</h4>{fruta&&<p className="text-xs">Documento: {fruta[1]} g · {fruta[2]} kcal; não é equivalência.</p>}<button type="button" className="acao-secundaria mt-2" disabled={!plano||ocupado} onClick={()=>salvar(nome)}>Selecionar {nome}</button></article>;})}</div>}
   <p className="text-xs">Dados calculáveis: {alimentosTaco.length} alimentos da <a className="underline" href={fonteTaco} target="_blank" rel="noreferrer">TACO, NEPA/UNICAMP</a>. Os demais nomes vêm do documento ou do plano e não têm composição completa cadastrada.</p>
  </div>
 </section>;
}
