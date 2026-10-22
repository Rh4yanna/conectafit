import MensagemTemporaria from '../../components/MensagemTemporaria';
import AcompanhamentoNutri from '../../components/alimentacao/AcompanhamentoNutri';
import AcompanhamentoPersonal from '../../components/personal/AcompanhamentoPersonal';
import EvolucaoProfissional from '../../components/evolucao/EvolucaoProfissional';
/* eslint-disable react/prop-types */


import{useCallback,useEffect,useState}from'react';import{Camera,Ruler,Target,X}from'lucide-react';import{apiFetch}from'../../config/api';
export default function DetalhesAluno({alunoId,tipo,onClose}){const[dados,setDados]=useState(null),[erro,setErro]=useState('');const carregar=useCallback(()=>apiFetch(`/profissional/alunos/${alunoId}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);setDados(d)}).catch(e=>setErro(e.message)),[alunoId]);

    useEffect(()=>{carregar();},[carregar]);
        return <div className="fit-modal-overlay fixed inset-0 z-[80] bg-black/80 p-4 flex justify-center items-center" onClick={onClose}>
            <article onClick={e=>e.stopPropagation()} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-3xl p-6 text-white">
                <button aria-label="Fechar detalhes do aluno" onClick={onClose} className="float-right"><X/></button>{erro&&<MensagemTemporaria as="p" className="text-red-400">{erro}</MensagemTemporaria>}
                {!dados?<p>Carregando...</p>:<><h2 className="text-2xl font-black">{dados.usuario.nome}</h2><p className="text-neutral-400">{dados.usuario.email} · {dados.usuario.telefone||'Sem telefone'}</p><div className="grid md:grid-cols-3 gap-4 my-6"><section className="bg-neutral-950 rounded-2xl p-4"><h3 className="flex gap-2 font-bold"><Target/>Metas</h3>{dados.metas?<p className="text-sm mt-3 text-neutral-300">{dados.metas.treinos_semana} treinos/semana<br/>{dados.metas.agua_litros} L de água/dia<br/>{dados.metas.peso_meta||'—'} kg desejados</p>:<p className="text-xs text-neutral-500 mt-3">Sem permissão ou metas.</p>}</section><section className="bg-neutral-950 rounded-2xl p-4"><h3 className="flex gap-2 font-bold"><Ruler/>Medidas</h3><p className="text-3xl font-black mt-3">{dados.medidas?.[0]?.peso||'—'} <small className="text-sm">kg</small></p><p className="text-xs text-neutral-500">{dados.medidas?.length||0} registros</p></section><section className="bg-neutral-950 rounded-2xl p-4"><h3 className="flex gap-2 font-bold"><Camera/>Fotos</h3><p className="text-3xl font-black mt-3">{dados.fotos?.length||0}</p><p className="text-xs text-neutral-500">conjuntos autorizados</p></section></div>{tipo==='nutri' ? <AcompanhamentoNutri alunoId={alunoId}/> : (dados.permissoes.permite_principal?<AcompanhamentoPersonal alunoId={alunoId}/>:<p>O aluno precisa autorizar treinos para disponibilizar a avaliação e a prescrição.</p>)}<EvolucaoProfissional alunoId={alunoId} onAtualizar={carregar}/></>}</article></div>}
