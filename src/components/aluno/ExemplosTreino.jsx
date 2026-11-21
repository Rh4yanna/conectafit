/* eslint-disable react/prop-types */
export default function ExemplosTreino({aba,lista}){
 if(!lista.length)return null;
 const data=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
 return <div className="space-y-3">
 {aba==='historico'?lista.map(s=><details key={s.id} className="border border-neutral-500/25 rounded-xl p-3"><summary className="cursor-pointer font-semibold">{s.titulo} · {data(s.inicio)}</summary><div className="space-y-2 mt-3 text-sm"><p>{data(s.inicio)} até {data(s.fim)} · {Math.round((new Date(s.fim)-new Date(s.inicio))/60000)} minutos</p><ul className="list-disc pl-5">{s.exercicios.map(([nome,carga],i)=><li key={i}>{nome} · {carga}</li>)}</ul><p>{s.observacoes}</p></div></details>):lista.flatMap(s=>s.feedbacks.map(([exercicio,mensagem],i)=><article key={`${s.id}-${i}`} className="border border-neutral-500/25 rounded-xl p-3"><h3 className="font-bold">{exercicio}</h3><p className="text-sm">{data(s.inicio)}</p><p className="mt-2">{mensagem}</p></article>))}
 </div>;
}
