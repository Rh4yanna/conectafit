import {useCallback,useEffect,useRef,useState} from 'react';
import {apiFetch} from '../../config/api';
export {campo,botao,painel,dias} from '../servicos/comum';
export {dataBr,hoje} from '../rotina/comum';
export async function personal(path,options={}){const r=await apiFetch(`/personal${path}`,{signal:AbortSignal.timeout(30000),...options});const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível atualizar o acompanhamento.');return d;}
export function usePersonal(path){const [dados,setDados]=useState(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true),ref=useRef(null);const carregar=useCallback(async()=>{const atual=Symbol();ref.current=atual;setCarregando(true);setErro('');try{const d=await personal(path);if(ref.current===atual)setDados(d);}catch(e){if(ref.current===atual)setErro(e.message);}finally{if(ref.current===atual)setCarregando(false);}},[path]);useEffect(()=>{carregar();return()=>{ref.current=null;};},[carregar]);return {dados,erro,carregando,carregar};}

export const botaoPrimario='rounded-lg bg-sky-600 text-white font-semibold px-4 py-2 disabled:opacity-50';
