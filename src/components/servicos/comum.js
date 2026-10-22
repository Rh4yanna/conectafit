import {apiFetch} from '../../config/api';
export const dias=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
export const moeda=v=>v==null||v===''?'A consultar':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const campo='w-full rounded-lg border border-neutral-500/40 bg-transparent p-2';
export const botao='rounded-lg border border-sky-500 px-4 py-2 disabled:opacity-50';
export const painel='rounded-2xl border border-neutral-500/30 p-5 space-y-4';
export async function busca(path,options={}){const r=await apiFetch(`/busca${path}`,{signal:AbortSignal.timeout(15000),...options});const b=await r.json();if(!r.ok)throw new Error(b.message||'Não foi possível completar a operação.');return b;}

export const tipos={personal:'Personal trainer',nutricionista:'Nutricionista',academia:'Academia'};
export const periodos={diaria:'Diária',semanal:'Semanal',mensal:'Mensal',anual:'Anual'};
export const horario=s=>s.disponibilidade.length?s.disponibilidade.map(d=>`${dias[d.dia]}: ${d.inicio}–${d.fim}`).join('; '):'Não informado';
