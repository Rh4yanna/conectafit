/* eslint-disable react/prop-types */
import {useEffect,useState} from 'react';
import {MessageSquare,Star,UserRound} from 'lucide-react';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import {Caixa,secundario} from './operacao-comum';

export default function FeedbacksAcademia({api}){
 const [pagina,setPagina]=useState(0),[dados,setDados]=useState(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true);
 useEffect(()=>{let ativo=true;setCarregando(true);setErro('');api(`/feedbacks-academia?offset=${pagina*20}`).then(d=>{if(ativo)setDados(d);}).catch(e=>{if(ativo){setDados(null);setErro(e.message);}}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[api,pagina]);
 return <Caixa titulo="Avaliações e feedbacks da academia">
  {erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{carregando&&<p role="status">Carregando avaliações...</p>}
  {!carregando&&dados&&!dados.feedbacks.length&&<p>Nenhuma avaliação recebida nesta página.</p>}
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{dados?.feedbacks.map(f=><article key={f.id} className="min-w-0 rounded-2xl border border-neutral-500/30 bg-neutral-950/30 p-4 space-y-3"><div className="flex items-center gap-3">{f.foto_url?<img src={f.foto_url} alt={`Foto de ${f.aluno_nome}`} className="w-14 h-14 rounded-full object-cover shrink-0"/>:<div className="w-14 h-14 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0"><UserRound aria-hidden="true"/></div>}<div className="min-w-0"><h2 className="font-bold break-words">{f.aluno_nome}</h2><p className="text-xs text-neutral-400">{new Date(f.criado_em).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p></div></div><div className="flex items-center gap-1 text-amber-400" aria-label={`${f.nota} de 5 estrelas`}>{Array.from({length:5},(_,i)=><Star key={i} size={18} fill={i<f.nota?'currentColor':'none'} aria-hidden="true"/>)}<span className="text-sm ml-2 text-neutral-300">{f.nota}/5</span></div><p className="whitespace-pre-wrap break-words text-sm flex gap-2"><MessageSquare size={17} className="shrink-0 text-sky-400" aria-hidden="true"/>{f.comentario||'Sem comentário.'}</p></article>)}</div>
  {dados&&(pagina>0||dados.tem_mais)&&<div className="flex flex-wrap gap-3"><button className={secundario} disabled={carregando||pagina===0} onClick={()=>setPagina(p=>p-1)}>Anteriores</button><button className={secundario} disabled={carregando||!dados.tem_mais} onClick={()=>setPagina(p=>p+1)}>Mais avaliações</button></div>}
 </Caixa>;
}
