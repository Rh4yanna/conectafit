import MensagemTemporaria from '../MensagemTemporaria';
import {nutricao} from './nutricao';
import {ConteudoAnamnese} from './AnamneseNutri';
/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ModalAlimentacao from './ModalAlimentacao';
import { alimentacao } from './comum';
const alimentoVazio=()=>({nome:'',quantidade:'',unidade:'g',substituicoes:[]});
const refeicaoVazia=()=>({nome:'',horario:'',alimentos:[alimentoVazio()]});
export default function FormPlanoAlimentar({plano,alunoId,profissional=false,onClose,onSalvo,anamnese=null}){
  const {temaEscuro}=useTheme();
  const [form,setForm]=useState(()=>plano?{...plano,refeicoes:plano.refeicoes.map(r=>({...r,horario:r.horario?.slice(0,5)||'',alimentos:r.alimentos.map(a=>({...a,quantidade:a.quantidade??a.quantidade_gramas,unidade:a.unidade||'g',substituicoes:a.substituicoes||[]}))}))}:{titulo:'',descricao:'',meta_calorias:'',refeicoes:[refeicaoVazia()]});
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState(''),[consultada,setConsultada]=useState(false);
  const campo=`block w-full min-w-0 mt-1 border rounded-lg p-2.5 ${temaEscuro?'bg-neutral-950 border-neutral-600':'bg-white border-gray-400'}`;
  const atualizarRef=(i,mudar)=>setForm(f=>({...f,refeicoes:f.refeicoes.map((r,n)=>n===i?mudar(r):r)}));
  const atualizarAlimento=(i,j,mudar)=>atualizarRef(i,r=>({...r,alimentos:r.alimentos.map((a,n)=>n===j?mudar(a):a)}));
  const salvar=async e=>{e.preventDefault();setOcupado(true);setErro('');try{if(anamnese&&!consultada)throw new Error('Confirme a consulta à anamnese.');await alimentacao(`/planos${form.id?`/${form.id}`:''}`,form.id?'PUT':'POST',{...form,...(profissional?{aluno_id:alunoId,anamnese_id:anamnese?.id,anamnese_versao:anamnese?.versao}:{})});onSalvo();}catch(e){setErro(e.message);}finally{setOcupado(false);}};
  const guardar=async modelo=>{setOcupado(true);setErro('');setMensagem('');try{const d=await nutricao(modelo?'/modelos':`/pacientes/${alunoId}/rascunhos`,'POST',form);if(!modelo)setForm(f=>({...f,rascunho_id:d.id,rascunho_versao:d.versao}));setMensagem(modelo?'Modelo alimentar salvo.':'Rascunho salvo; ainda não publicado.');}catch(e){setErro(e.message);}finally{setOcupado(false);}};
  const camposAlimento=(a,alterar,label)=><div className="grid grid-cols-2 sm:grid-cols-[1fr_110px_90px] gap-3"><label className="col-span-2 sm:col-span-1 text-sm">{label}<input required maxLength={120} className={campo} value={a.nome} onChange={e=>alterar({...a,nome:e.target.value})}/></label><label className="text-sm">Quantidade<input required type="number" min="0.01" max="5000" step="0.01" className={campo} value={a.quantidade} onChange={e=>alterar({...a,quantidade:e.target.value})}/></label><label className="text-sm">Unidade<select aria-label="Unidade" className={campo} value={a.unidade} onChange={e=>alterar({...a,unidade:e.target.value})}>{['g','ml','un'].map(u=><option key={u}>{u}</option>)}</select></label></div>;
  return <ModalAlimentacao titulo={plano?.id?'Editar plano · nova versão':profissional?'Criar plano profissional':'Criar organização alimentar pessoal'} onClose={onClose} ocupado={ocupado}>
    <p className="text-sm mb-4">{profissional?'As substituições informadas serão identificadas como autorizadas por você. Cada alteração preserva a versão anterior.':'Organize suas refeições. Este cadastro pessoal não é uma prescrição nutricional e não altera planos recebidos do nutricionista.'}</p>
    {erro&&<MensagemTemporaria as="p" role="alert" className="border border-red-500 rounded-lg p-3 mb-3">{erro}</MensagemTemporaria>}
    {profissional&&anamnese&&<section className="border rounded-xl p-3 mb-4"><h3 className="font-bold">Anamnese de referência • versão {anamnese.versao}</h3><ConteudoAnamnese dados={anamnese.conteudo}/><label><input type="checkbox" checked={consultada} onChange={e=>setConsultada(e.target.checked)}/> Consultei objetivos, rotina, alergias e condições de preparo.</label></section>}
    <form onSubmit={salvar}><fieldset disabled={ocupado} className="space-y-5">
      <label className="block">Nome do plano<input required minLength={3} maxLength={120} className={campo} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></label>
      <label className="block">Observações do plano (opcional)<textarea maxLength={5000} className={campo} value={form.descricao||''} onChange={e=>setForm({...form,descricao:e.target.value})}/></label>
      {profissional&&<label className="block">Meta calórica (opcional)<input type="number" min="1" max="20000" step="1" className={campo} value={form.meta_calorias??''} onChange={e=>setForm({...form,meta_calorias:e.target.value})}/></label>}
      {profissional&&<><label className="block">Revisão prevista<input type="date" className={campo} value={form.revisao_em?.slice(0,10)||''} onChange={e=>setForm({...form,revisao_em:e.target.value})}/></label>{form.id&&<label className="block">Motivo da revisão<textarea maxLength={1000} className={campo} value={form.motivo||''} onChange={e=>setForm({...form,motivo:e.target.value})}/></label>}</>}
      {form.refeicoes.map((ref,i)=><fieldset key={i} className="border border-neutral-500/40 rounded-xl p-4 space-y-4"><legend className="font-bold px-2">Refeição {i+1}</legend><div className="grid sm:grid-cols-2 gap-3"><label>Nome da refeição<input required maxLength={100} placeholder="Ex.: Almoço" className={campo} value={ref.nome} onChange={e=>atualizarRef(i,r=>({...r,nome:e.target.value}))}/></label><label>Horário (opcional)<input type="time" className={campo} value={ref.horario} onChange={e=>atualizarRef(i,r=>({...r,horario:e.target.value}))}/></label></div>
        <label className="block">Orientações da refeição {i+1}<textarea maxLength={2000} className={campo} value={ref.orientacoes||''} onChange={e=>atualizarRef(i,r=>({...r,orientacoes:e.target.value}))}/></label>
        {!ref.alimentos.length&&<label className="block">Descrição legada<textarea required className={campo} maxLength={5000} value={ref.detalhes||''} onChange={e=>atualizarRef(i,r=>({...r,detalhes:e.target.value}))}/></label>}
        {ref.alimentos.map((a,j)=><div key={j} className="border-t border-neutral-500/30 pt-3 space-y-3">{camposAlimento(a,novo=>atualizarAlimento(i,j,()=>novo),`Alimento ${j+1}`)}
          {profissional&&<div className="border-l-2 border-sky-500 pl-3 space-y-3"><p className="text-sm font-semibold">Substituições autorizadas para {a.nome||'este alimento'}</p>{(a.substituicoes||[]).map((s,k)=><div key={k}>{camposAlimento(s,novo=>atualizarAlimento(i,j,a=>({...a,substituicoes:a.substituicoes.map((v,n)=>n===k?novo:v)})),`Alternativa ${k+1}`)}<button type="button" className="text-sm acao-secundaria mt-2" onClick={()=>atualizarAlimento(i,j,a=>({...a,substituicoes:a.substituicoes.filter((_,n)=>n!==k)}))}>Remover alternativa {k+1}</button></div>)}<button type="button" className="acao-secundaria text-sky-500 disabled:opacity-40" disabled={a.substituicoes?.length>=10} onClick={()=>atualizarAlimento(i,j,a=>({...a,substituicoes:[...(a.substituicoes||[]),alimentoVazio()]}))}>Adicionar substituição</button></div>}
          {ref.alimentos.length>1&&<button type="button" className="text-sm acao-secundaria text-red-500" onClick={()=>atualizarRef(i,r=>({...r,alimentos:r.alimentos.filter((_,n)=>n!==j)}))}>Remover alimento {j+1}</button>}
        </div>)}
        <div className="flex flex-wrap gap-4"><button type="button" disabled={ref.alimentos.length>=50} className="acao-secundaria text-sky-500" onClick={()=>atualizarRef(i,r=>({...r,alimentos:[...r.alimentos,alimentoVazio()]}))}>Adicionar alimento</button>{form.refeicoes.length>1&&<button type="button" className="acao-secundaria text-red-500" onClick={()=>setForm(f=>({...f,refeicoes:f.refeicoes.filter((_,n)=>n!==i)}))}>Remover refeição {i+1}</button>}</div>
      </fieldset>)}
      <button type="button" disabled={form.refeicoes.length>=12} className="acao-secundaria text-sky-500" onClick={()=>setForm(f=>({...f,refeicoes:[...f.refeicoes,refeicaoVazia()]}))}>Adicionar refeição</button>
      {profissional&&<div className="flex gap-3"><button type="button" className="acao-secundaria" onClick={()=>guardar(false)}>Salvar rascunho</button><button type="button" className="acao-secundaria" onClick={()=>guardar(true)}>Salvar como modelo</button></div>}{mensagem&&<MensagemTemporaria as="p" role="status">{mensagem}</MensagemTemporaria>}
      <button className="block w-full bg-sky-600 rounded-xl p-3 text-white font-bold disabled:opacity-50">{ocupado?'Salvando...':form.id?'Salvar nova versão':profissional?'Publicar plano para o aluno':'Salvar plano pessoal'}</button>
    </fieldset></form>
  </ModalAlimentacao>;
}
