import MensagemTemporaria from '../MensagemTemporaria';
/* eslint-disable react/prop-types */
import {useEffect,useRef,useState} from 'react';
import {apiFetch} from '../../config/api';
export default function DemonstracaoPropria({dados}){
 const [url,setUrl]=useState(''),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(false),recurso=useRef(''),requisicao=useRef(null);
 useEffect(()=>()=>{requisicao.current?.abort();if(recurso.current)URL.revokeObjectURL(recurso.current);},[]);
 if(!dados)return null;
 const carregar=async()=>{setErro('');setCarregando(true);const controller=new AbortController();requisicao.current=controller;try{const r=await apiFetch(`/demonstracoes/${dados.id}/video`,{signal:controller.signal});if(!r.ok)throw new Error('Vídeo indisponível para esta conta. Tente novamente ou informe o personal.');const blob=await r.blob();if(controller.signal.aborted)return;if(recurso.current)URL.revokeObjectURL(recurso.current);recurso.current=URL.createObjectURL(blob);setUrl(recurso.current);}catch(e){if(!controller.signal.aborted)setErro(e.message);}finally{if(!controller.signal.aborted)setCarregando(false);}};
 return <section className="border border-neutral-500/30 rounded-xl p-3 space-y-3"><p className="font-semibold">Demonstração do personal: {dados.nome}</p><p className="text-sm">{dados.variacao||'Variação padrão informada pelo personal'} • {dados.equipamentos.join(', ')} • {dados.autor_nome}</p>{url?<video aria-label={`Demonstração própria de ${dados.nome}`} src={url} controls playsInline preload="metadata" className="w-full max-h-80 bg-black rounded-xl" onError={()=>setErro('Vídeo incompatível ou indisponível. Tente novamente ou informe o personal.')}/>:<button type="button" className="acao-secundaria" disabled={carregando} onClick={carregar}>{carregando?'Carregando vídeo...':'Carregar demonstração própria'}</button>}{erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}<small>Conteúdo fornecido pelo personal.</small></section>;
}
