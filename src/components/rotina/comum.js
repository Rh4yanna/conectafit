import {useCallback,useEffect,useRef,useState} from 'react';
import {apiFetch} from '../../config/api';
export {campo,botao,painel} from '../servicos/comum';
export const dataBr=d=>d?.slice(0,10).split('-').reverse().join('/')||'';
export const hoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
export const estados={pendente:'Aguardando confirmação',confirmado:'Confirmado',remarcacao:'Remarcação em análise',cancelado:'Cancelado',realizado:'Realizado',ausente:'Não compareceu'};
export async function rotina(path,options={}){const r=await apiFetch(`/rotina${path}`,{signal:AbortSignal.timeout(15000),...options});const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível carregar a rotina.');return d;}
export function useRotina(path){
 const [dados,setDados]=useState(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true),ref=useRef(null);
 const carregar=useCallback(async()=>{const atual=Symbol();ref.current=atual;setCarregando(true);setErro('');try{const d=await rotina(path);if(ref.current===atual)setDados(d);}catch(e){if(ref.current===atual)setErro(e.message);}finally{if(ref.current===atual)setCarregando(false);}},[path]);
 useEffect(()=>{carregar();return()=>{ref.current=null;};},[carregar]);
 return {dados,erro,carregando,carregar};
}
