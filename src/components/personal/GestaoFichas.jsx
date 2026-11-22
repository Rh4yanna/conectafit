import MensagemTemporaria from '../MensagemTemporaria';
/* eslint-disable react/prop-types */
import {useState} from 'react';
import Modal from '../alimentacao/ModalAlimentacao';
import {personal,usePersonal,botao,campo} from './comum';
export function Programacao({form,setForm}){return <div className="grid sm:grid-cols-2 gap-3"><label>Início da programação<input type="date" className={campo} value={form.inicio_em||''} onChange={e=>setForm(f=>({...f,inicio_em:e.target.value}))}/></label><label>Fim da programação<input type="date" min={form.inicio_em||undefined} className={campo} value={form.fim_em||''} onChange={e=>setForm(f=>({...f,fim_em:e.target.value}))}/></label><label>Revisão prevista<input type="date" className={campo} value={form.revisao_em||''} onChange={e=>setForm(f=>({...f,revisao_em:e.target.value}))}/></label><p className="text-sm sm:col-span-2">Datas opcionais. O treino do dia respeita os dias da semana e este período.</p></div>;}
export function AcervoFichas({alunoId,abrir,atualizacao}){
 return <Acervo key={atualizacao} alunoId={alunoId} abrir={abrir}/>;
}
function Acervo({alunoId,abrir}){
 const r=usePersonal(`/alunos/${alunoId}/rascunhos`),m=usePersonal('/modelos');
 return <div className="grid sm:grid-cols-2 gap-4">{[[r,'Rascunhos privados',true],[m,'Modelos reutilizáveis',false]].map(([h,tipo,rascunho])=><details key={tipo} className="border rounded-xl p-3"><summary>{tipo} ({h.dados?.length||0})</summary>{h.erro&&<MensagemTemporaria as="p" role="alert">{h.erro}</MensagemTemporaria>}{h.carregando&&<p>Carregando...</p>}{h.dados?.map(d=><div key={d.id} className="py-2 flex gap-2 items-center"><span>{d.conteudo.titulo}</span><button className={botao} onClick={()=>abrir({...d.conteudo,versao_profissional:d.conteudo.versao,...(rascunho?{rascunho_id:d.id,rascunho_versao:d.versao}:{id:null,versao_profissional:0})})}>{rascunho?'Continuar rascunho':'Usar modelo'}</button></div>)}</details>)}</div>;
}
export function AcoesFicha({t,alunoId,carregar}){
 const [modal,setModal]=useState(false),[motivo,setMotivo]=useState(''),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false);
 const excluir=async e=>{e.preventDefault();setOcupado(true);setErro('');try{await personal(`/alunos/${alunoId}/fichas/${t.id}`,{method:'DELETE',body:JSON.stringify({versao:t.versao_profissional,motivo})});setModal(false);await carregar();}catch(e){setErro(e.message);}finally{setOcupado(false);}};
 return <><button className="acao-secundaria" onClick={()=>{setErro('');setMotivo('');setModal(true);}}>Excluir ficha</button>{modal&&<Modal titulo="Excluir ficha" ocupado={ocupado} onClose={()=>setModal(false)}><form onSubmit={excluir} className="space-y-4"><p>Esta ação retira a ficha da programação do aluno. Sessões anteriores e sessões em andamento são preservadas.</p><label>Motivo<textarea required maxLength={1000} className={campo} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button className={botao} disabled={ocupado}>Confirmar alteração</button></form>{erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}</Modal>}</>;
}
