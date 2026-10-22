import MensagemTemporaria from '../MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useEffect,useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ModalAlimentacao from './ModalAlimentacao';
import { alimentacao,dataBR,quantidade } from './comum';
export default function DetalhesPlanoAlimentar({plano,onClose,onRegistrar,onDuvida}){
  const {temaEscuro}=useTheme();const [versoes,setVersoes]=useState([]),[selecionada,setSelecionada]=useState(plano.versao),[erro,setErro]=useState('');
  useEffect(()=>{let ativo=true;alimentacao(`/planos/${plano.id}/versoes`).then(v=>{if(ativo)setVersoes(v);}).catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};},[plano.id]);
  const versao=versoes.find(v=>v.versao===Number(selecionada)),conteudo=versao?.conteudo;
  return <ModalAlimentacao titulo={plano.titulo} onClose={onClose}>
    {erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{!conteudo&&!erro&&<p role="status">Carregando versões...</p>}
    {conteudo&&<div className="space-y-5"><details><summary className="cursor-pointer text-sm font-semibold">Histórico do plano</summary><label className="block mt-3">Versão do plano<select className={`block w-full p-3 border rounded-lg mt-1 ${temaEscuro?'bg-neutral-950':'bg-white'}`} value={selecionada} onChange={e=>setSelecionada(Number(e.target.value))}>{versoes.map(v=><option key={v.versao} value={v.versao}>Versão {v.versao} · {dataBR(v.criado_em)}{v.versao===plano.versao?' · Mais recente':''}</option>)}</select></label></details>
      <p className="text-sm">{conteudo.origem==='nutricionista'?`Prescrição profissional · ${conteudo.autoria||'Nutricionista responsável'}`:'Organização pessoal · não é prescrição profissional'}</p>
      {Number(selecionada)!==plano.versao&&<p className="border border-amber-500 rounded-lg p-3">Você está consultando uma versão anterior, somente para leitura.</p>}
      {conteudo.motivo&&<p>Motivo da revisão: {conteudo.motivo}</p>}{conteudo.revisao_em&&<p>Revisão prevista: {conteudo.revisao_em.slice(0,10)}</p>}{conteudo.descricao&&<p className="whitespace-pre-wrap">{conteudo.descricao}</p>}
      {!conteudo.refeicoes.length&&<p>Este plano antigo não possui refeições detalhadas. O autor precisa atualizar o conteúdo.</p>}
      {conteudo.refeicoes.map(ref=><article className="rounded-xl border border-neutral-500/40 p-4 space-y-3" key={ref.id}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{ref.nome}</h3><span>{ref.horario?.slice(0,5)||'Sem horário definido'}</span></div>
        {ref.orientacoes&&<p className="whitespace-pre-wrap">{ref.orientacoes}</p>}
        {ref.alimentos?.length?<ul className="space-y-3">{ref.alimentos.map((a,i)=><li key={i}><div className="flex justify-between gap-3"><span>{a.nome}</span><strong className="shrink-0">{quantidade(a)}</strong></div>{a.substituicoes?.length>0&&conteudo.origem==='nutricionista'&&<div className="mt-2 border-l-2 border-sky-500 pl-3 text-sm"><p className="font-semibold">Substituições autorizadas</p><ul className="list-disc pl-5">{a.substituicoes.map((s,j)=><li key={j}>{s.nome} · {quantidade(s)}</li>)}</ul><p className="mt-1">Escolha uma alternativa; não some às quantidades do alimento original.</p></div>}</li>)}</ul>:<p>{ref.detalhes}</p>}
        {onRegistrar&&<div className="flex flex-wrap gap-4"><button className="bg-sky-600 text-white rounded-lg p-2.5" onClick={()=>onRegistrar({plano_id:plano.id,plano_versao:versao.versao,refeicao_id:ref.id,nome:ref.nome,contexto:{titulo:conteudo.titulo,versao:versao.versao,refeicao:ref}})}>Registrar refeição</button>{plano.nutri_id&&conteudo.origem==='nutricionista'&&<button className="acao-secundaria" onClick={()=>onDuvida({plano_id:plano.id,plano_versao:versao.versao,refeicao_id:ref.id,nome:ref.nome,autoria:conteudo.autoria})}>Perguntar ao nutricionista</button>}</div>}
      </article>)}
    </div>}
  </ModalAlimentacao>;
}
