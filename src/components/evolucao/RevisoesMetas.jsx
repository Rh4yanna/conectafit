import MensagemTemporaria from '../MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useEffect,useState } from 'react';
import Modal from '../alimentacao/ModalAlimentacao';
import { evolucao,dataBR,indicadores,nomesMetas,numero } from './comum';
export default function RevisoesMetas({objetivo,onClose}){
  const [lista,setLista]=useState(null),[erro,setErro]=useState('');
  useEffect(()=>{let ativo=true;evolucao(objetivo?`/objetivos/${objetivo.id}/revisoes`:'/metas/revisoes').then(d=>{if(ativo)setLista(d);}).catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};},[objetivo]);
  return <Modal titulo="Histórico de revisões" onClose={onClose}>{erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{!lista&&!erro&&<p role="status">Carregando revisões...</p>}{lista&&!lista.length&&<p>Nenhuma revisão registrada.</p>}<div className="space-y-4">{lista?.map(r=><article key={r.versao} className="border border-neutral-500/40 rounded-xl p-4 space-y-3"><h3 className="font-bold">Versão {r.versao} · {dataBR(r.criada_em)}</h3><p className="whitespace-pre-wrap">{r.motivo||'Sem motivo informado.'}</p>{objetivo?<><p>{r.conteudo.titulo} · {r.conteudo.status}</p><p>{indicadores[r.conteudo.indicador]?.[0]} · {r.conteudo.direcao==='reduzir'?'Reduzir até':'Atingir'} {numero(r.conteudo.alvo)} {indicadores[r.conteudo.indicador]?.[1]}</p><p>{dataBR(r.conteudo.inicio)} a {dataBR(r.conteudo.prazo)}</p><ul>{r.conteudo.etapas.map((e,i)=><li key={i}>{e.titulo}: {numero(e.alvo)} até {dataBR(e.prazo)}</li>)}</ul></>:<dl className="grid sm:grid-cols-2 gap-2">{Object.entries(nomesMetas).map(([k,n])=><div key={k}><dt className="text-sm">{n}</dt><dd className="font-semibold">{r.conteudo[k]==null?'Não definido':numero(r.conteudo[k])}</dd></div>)}</dl>}</article>)}</div></Modal>;
}
