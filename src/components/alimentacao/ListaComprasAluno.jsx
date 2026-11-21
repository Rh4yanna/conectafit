import {useCallback,useEffect,useState} from 'react';
import {Trash2,Plus} from 'lucide-react';
import ModalAlimentacao from './ModalAlimentacao';
import {alimentacao} from './comum';
/* eslint-disable react/prop-types */
const unidades=[['un','un'],['l','L'],['caixa','cx'],['pacote','pct'],['g','g'],['kg','kg']];
const vazio=()=>({nome:'',quantidade:'',unidade:'un',categoria:'Outros',comprado:false});
const campo='rounded-lg border border-neutral-500/40 bg-transparent p-2 min-w-0';
function LinhaItem({item,ocupado,salvar,excluir,editar}){
 const [quantidade,setQuantidade]=useState(item.quantidade??'');
 useEffect(()=>setQuantidade(item.quantidade??''),[item.quantidade]);
 const atualizarQuantidade=()=>{
  const valor=quantidade===''?null:Number(quantidade);
  if(valor!==null&&(!Number.isFinite(valor)||valor<=0||valor>1000000)){setQuantidade(item.quantidade??'');return;}
  if(valor!==(item.quantidade===null?null:Number(item.quantidade)))salvar({...item,quantidade:valor});
 };
 return <li className="grid grid-cols-[auto_minmax(0,1fr)_4.25rem_4.25rem_auto] sm:grid-cols-[auto_minmax(0,1fr)_5.5rem_5.5rem_auto] gap-1 sm:gap-3 items-center border-b border-neutral-500/20 py-2">
  <input type="checkbox" className="h-5 w-5" aria-label={`Marcar ${item.nome} como comprado`} checked={item.comprado} disabled={ocupado} onChange={e=>salvar({...item,comprado:e.target.checked})}/>
  <button type="button" className={`min-w-0 text-left break-words ${item.comprado?'line-through opacity-60':''}`} onClick={()=>editar(item)}>{item.nome}</button>
  <input aria-label={`Quantidade de ${item.nome}`} className={campo+' w-full text-sm'} type="number" min="0.01" max="1000000" step="0.01" placeholder="—" value={quantidade} disabled={ocupado} onChange={e=>setQuantidade(e.target.value)} onBlur={atualizarQuantidade}/>
  <select aria-label={`Unidade de ${item.nome}`} className={campo+' w-full text-sm'} value={item.unidade} disabled={ocupado} onChange={e=>salvar({...item,unidade:e.target.value})}>{item.unidade==='ml'&&<option value="ml">ml</option>}{unidades.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select>
  <button type="button" className="p-1 text-red-500" aria-label={`Excluir ${item.nome}`} disabled={ocupado} onClick={()=>excluir(item)}><Trash2 size={18}/></button>
 </li>;
}
export default function ListaComprasAluno({plano}){
 const base=`/planos/${plano.id}/lista-compras`,[itens,setItens]=useState(null),[erro,setErro]=useState(''),[form,setForm]=useState(null),[ocupado,setOcupado]=useState(false);
 const carregar=useCallback(async()=>{try{setItens(await alimentacao(base));setErro('');}catch(e){setErro(e.message);}},[base]);
 useEffect(()=>{carregar();},[carregar]);
 const agir=async fn=>{setOcupado(true);setErro('');try{await fn();await carregar();}catch(e){await carregar();setErro(e.message);}finally{setOcupado(false);}};
 const salvarItem=item=>{setItens(v=>v.map(x=>x.id===item.id?item:x));agir(()=>alimentacao(`${base}/${item.id}`,'PUT',item));};
 const salvarForm=e=>{e.preventDefault();const dados=form;agir(async()=>{await alimentacao(base+(dados.id?`/${dados.id}`:''),dados.id?'PUT':'POST',dados);setForm(null);});};
 const ordenados=[...(itens||[])].sort((a,b)=>Number(a.comprado)-Number(b.comprado)||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
 return <section className="border border-neutral-500/25 rounded-2xl p-4 sm:p-5 space-y-3" aria-label="Lista de compras">
  <header className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Lista de compras</h2><button type="button" aria-label="Adicionar item" title="Adicionar item" className="rounded-xl border border-sky-500 text-sky-600 p-2" onClick={()=>setForm(vazio())}><Plus size={22}/></button></header>
  {erro&&<p role="alert" className="text-red-500">{erro} <button type="button" className="underline" onClick={carregar}>Tentar novamente</button></p>}
  {!itens&&!erro&&<p role="status">Carregando lista...</p>}
  {itens?.length===0&&<p>Adicione seu primeiro item.</p>}
  <ul>{ordenados.map(item=><LinhaItem key={item.id} item={item} ocupado={ocupado} salvar={salvarItem} editar={x=>setForm({...x})} excluir={x=>{if(window.confirm(`Excluir ${x.nome}?`))agir(()=>alimentacao(`${base}/${x.id}`,'DELETE'));}}/>)}</ul>
  {form&&<ModalAlimentacao titulo={form.id?'Editar item':'Adicionar item'} onClose={()=>setForm(null)} ocupado={ocupado}><form onSubmit={salvarForm} className="space-y-4">
   <label className="block">Nome do item<input className={campo+' block w-full mt-1'} required maxLength={120} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label>
   <div className="grid grid-cols-2 gap-3"><label>Quantidade<input className={campo+' block w-full mt-1'} type="number" min="0.01" max="1000000" step="0.01" value={form.quantidade??''} onChange={e=>setForm({...form,quantidade:e.target.value})}/></label>
    <label>Unidade<select className={campo+' block w-full mt-1'} value={form.unidade} onChange={e=>setForm({...form,unidade:e.target.value})}>{form.unidade==='ml'&&<option value="ml">ml</option>}{unidades.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label></div>
   <div className="flex gap-3"><button disabled={ocupado} className="bg-sky-600 text-white rounded-lg px-4 py-2">Salvar</button><button type="button" className="acao-secundaria" onClick={()=>setForm(null)}>Cancelar</button></div>
  </form></ModalAlimentacao>}
 </section>;
}
