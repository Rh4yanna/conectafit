/* eslint-disable react/prop-types */
import {useState} from 'react';
import {Clock, ArrowLeftRight, Utensils} from 'lucide-react';
import {quantidade} from './comum';
import ModalAlimentacao from './ModalAlimentacao';

export default function RefeicoesAluno({planos,onRegistrar,onDuvida,onEditar,onExcluir}) {
  const [selecionado,setSelecionado]=useState('');
  const [troca,setTroca]=useState(null);
  const ativos=planos.filter(p=>p.ativo||p.vigente);
  const plano=ativos.find(p=>String(p.id)===selecionado)||ativos.find(p=>p.vigente)||ativos[0];
  if(!plano)return null;
  const profissional=plano.origem==='nutricionista';
  return <section aria-label="Minhas refeições" className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Minhas refeições</h2><p className="text-sm text-neutral-400">{plano.titulo} · {profissional?plano.autoria||'Nutricionista':'Plano pessoal'}{plano.vigente?' · Atual':''}</p></div>
      {ativos.length>1&&<label className="text-sm">Plano <select className="ml-2 rounded-xl border p-2" value={plano.id} onChange={e=>setSelecionado(e.target.value)}>{ativos.map(p=><option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>}
    </header>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      {plano.refeicoes.map(ref=><article key={ref.id} className="bg-white dark:bg-neutral-900 border border-neutral-500/30 rounded-2xl p-4 space-y-4">
        <header className="flex items-center justify-between gap-2"><Utensils size={20} className="text-sky-500"/><span className="text-sm text-neutral-400 flex items-center gap-1"><Clock size={14}/>{ref.horario?.slice(0,5)||'Sem horário'}</span></header>
        <h3 className="font-bold text-lg">{ref.nome}</h3>
        {ref.alimentos?.length?<ul className="space-y-2">{ref.alimentos.map((a,i)=><li key={i} className="flex justify-between gap-3 text-sm"><span>{a.nome}</span><strong className="shrink-0">{quantidade(a)}</strong></li>)}</ul>:<p className="text-sm whitespace-pre-wrap">{ref.detalhes||'Sem alimentos cadastrados.'}</p>}
        {ref.orientacoes&&<details><summary className="cursor-pointer text-sm font-semibold">Orientações</summary><p className="text-sm whitespace-pre-wrap mt-2">{ref.orientacoes}</p></details>}
        <div className="flex flex-col gap-2">
          {plano.origem==='pessoal'&&<div className="flex flex-wrap gap-3">{onEditar&&<button type="button" className="acao-secundaria" onClick={()=>onEditar(plano)}>Editar refeição</button>}{onExcluir&&<button type="button" className="acao-secundaria text-red-500" onClick={()=>onExcluir(plano,ref)}>Excluir refeição</button>}</div>}
          {profissional&&<button type="button" className="acao-secundaria" onClick={()=>setTroca({plano,ref})}><ArrowLeftRight size={16}/>Ver substituições</button>}
          {onRegistrar&&<button type="button" className="bg-sky-600 text-white font-semibold rounded-xl p-3" onClick={()=>onRegistrar({plano_id:plano.id,plano_versao:plano.versao,refeicao_id:ref.id,nome:ref.nome,contexto:{titulo:plano.titulo,versao:plano.versao,refeicao:ref}})}>Registrar refeição</button>}
        </div>
      </article>)}
    </div>
    {!plano.refeicoes.length&&<p className="text-sm">Este plano ainda não tem refeições cadastradas.</p>}
    {troca&&<ModalAlimentacao titulo={`Substituições · ${troca.ref.nome}`} onClose={()=>setTroca(null)}>
      <p className="text-sm mb-4">Escolha uma alternativa indicada pelo nutricionista, sem somar ao alimento original.</p>
      <div className="space-y-4">{troca.ref.alimentos?.map((a,i)=><section key={i} className="border border-neutral-500/30 rounded-xl p-4 space-y-3"><h3 className="font-bold">Trocar {a.nome} · {quantidade(a)}</h3>{a.substituicoes?.length?<ul className="space-y-2">{a.substituicoes.map((s,j)=><li key={j} className="flex justify-between gap-3 text-sm"><span>{s.nome}</span><strong>{quantidade(s)}</strong></li>)}</ul>:<p className="text-sm text-neutral-400">Sem substituição cadastrada para este alimento.</p>}</section>)}</div>
      {!troca.ref.alimentos?.length&&<p>Esta refeição não tem substituições cadastradas.</p>}
      {onDuvida&&troca.plano.nutri_id&&<button type="button" className="acao-secundaria mt-4" onClick={()=>{onDuvida({plano_id:troca.plano.id,plano_versao:troca.plano.versao,refeicao_id:troca.ref.id,nome:troca.ref.nome,autoria:troca.plano.autoria});setTroca(null);}}>Perguntar ao nutricionista</button>}
    </ModalAlimentacao>}
  </section>;
}
