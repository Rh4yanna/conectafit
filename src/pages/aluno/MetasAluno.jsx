import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Save, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../config/api';

const camposMeta = [
  ['peso_meta','Peso desejado (kg)'],['cintura_meta','Cintura desejada (cm)'],
  ['braco_meta','Braço desejado (cm)'],['quadril_meta','Quadril desejado (cm)'],
  ['percentual_gordura_meta','Gordura corporal desejada (%)'],['agua_litros','Água por dia (litros)'],
  ['treinos_semana','Treinos por semana'],['refeicoes_semana','Refeições corretas por semana']
];

export default function MetasAluno(){
  const navigate=useNavigate();
  const [meta,setMeta]=useState({agua_litros:2,treinos_semana:3,refeicoes_semana:14});
  const [progresso,setProgresso]=useState({agua_litros:0,treinos_concluidos:0,refeicoes_corretas:0});
  const [mensagem,setMensagem]=useState('');
  useEffect(()=>{apiFetch('/aluno/metas').then(r=>r.json()).then(d=>{if(d.meta)setMeta(d.meta);if(d.progresso)setProgresso(d.progresso);});},[]);
  const salvar=async(e)=>{e.preventDefault();setMensagem('');const [a,b]=await Promise.all([
    apiFetch('/aluno/metas',{method:'PUT',body:JSON.stringify(meta)}),apiFetch('/aluno/progresso',{method:'PUT',body:JSON.stringify(progresso)})
  ]);setMensagem(a.ok&&b.ok?'Metas e progresso salvos.':'Não foi possível salvar.');};
  const input='w-full mt-2 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-[#00AEFF]';
  return <main className="min-h-screen bg-black text-white p-5 lg:p-10 pb-24">
    <div className="max-w-5xl mx-auto"><button onClick={()=>navigate('/aluno/dashboard')} className="flex gap-2 text-neutral-400 hover:text-white mb-7"><ArrowLeft/>Voltar</button>
    <div className="flex items-center gap-3 mb-8"><Target className="text-[#00AEFF] w-9 h-9"/><div><h1 className="text-3xl font-black">Minhas metas</h1><p className="text-neutral-400">Defina onde quer chegar e registre sua semana.</p></div></div>
    <form onSubmit={salvar} className="space-y-6"><section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><h2 className="font-black text-xl mb-5">Objetivos</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{camposMeta.map(([nome,label])=><label key={nome} className="text-sm text-neutral-300">{label}<input className={input} type="number" min="0" step={nome.includes('semana')?'1':'0.1'} value={meta[nome]??''} onChange={e=>setMeta({...meta,[nome]:e.target.value})}/></label>)}</div></section>
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><h2 className="font-black text-xl mb-1">Progresso desta semana</h2><p className="text-sm text-neutral-400 mb-5">Atualize os números conforme cumprir suas metas.</p><div className="grid sm:grid-cols-3 gap-4">{[['agua_litros','Litros consumidos'],['treinos_concluidos','Treinos concluídos'],['refeicoes_corretas','Refeições corretas']].map(([nome,label])=><label key={nome} className="text-sm text-neutral-300">{label}<input className={input} type="number" min="0" step={nome==='agua_litros'?'0.1':'1'} value={progresso[nome]??0} onChange={e=>setProgresso({...progresso,[nome]:e.target.value})}/></label>)}</div></section>
    {mensagem&&<p className="flex gap-2 text-emerald-400"><CheckCircle2/>{mensagem}</p>}<button className="w-full rounded-2xl bg-[#00AEFF] py-4 font-black flex justify-center gap-2"><Save/>Salvar metas</button></form></div>
  </main>;
}
