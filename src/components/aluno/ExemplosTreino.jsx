import {useEffect,useState} from 'react';
import {apiFetch} from '../../config/api';
/* eslint-disable react/prop-types */
export default function ExemplosTreino({aba}){
 const [lista,setLista]=useState([]),[erro,setErro]=useState('');
 useEffect(()=>{let atual=true;apiFetch('/sessoes-treino/exemplos').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(atual)setLista(d);}).catch(()=>{if(atual)setErro('Não foi possível carregar os exemplos.');});return()=>{atual=false;};},[]);
 if(!lista.length&&!erro)return null;
 const data=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
 return <section className="border border-neutral-500/30 rounded-2xl p-5 space-y-3"><h2 className="text-lg font-bold">{aba==='historico'?'Exemplos de treinos':'Exemplos de feedback'}</h2><p className="text-sm">Conteúdo fictício para apresentação; não representa sessões nem orientações reais.</p>{erro&&<p role="alert">{erro}</p>}
 {aba==='historico'?lista.map(s=><details key={s.id} className="border border-neutral-500/25 rounded-xl p-3"><summary className="cursor-pointer font-semibold">{s.titulo} · {data(s.inicio)}</summary><div className="space-y-2 mt-3 text-sm"><p>{data(s.inicio)} até {data(s.fim)} · {Math.round((new Date(s.fim)-new Date(s.inicio))/60000)} minutos</p><ul className="list-disc pl-5">{s.exercicios.map(([nome,carga],i)=><li key={i}>{nome} · {carga}</li>)}</ul><p>{s.observacoes}</p></div></details>):lista.flatMap(s=>s.feedbacks.map(([exercicio,mensagem],i)=><article key={`${s.id}-${i}`} className="border border-neutral-500/25 rounded-xl p-3"><h3 className="font-bold">{exercicio} · Exemplo fictício</h3><p className="text-sm">{data(s.inicio)}</p><p className="mt-2">{mensagem}</p></article>))}
 </section>;
}
