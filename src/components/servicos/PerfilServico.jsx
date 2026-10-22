import MensagemTemporaria from '../MensagemTemporaria';
import ContatosServico from './ContatosServico';
import FotoServico from './FotoServico';
import {enderecoPublico,fotoPublica} from '../../utils/contatosPublicos';
import ComercialAcademia from './ComercialAcademia';
import {useState} from 'react';
import InteresseConexao from './InteresseConexao';
/* eslint-disable react/prop-types */
import Modal from '../alimentacao/ModalAlimentacao';
import {tipos,periodos,horario,moeda,botao} from './comum';
export function ComparacaoServicos({selecionados,periodo,distancia,onClose}){
 const linhas=[['Categoria',s=>tipos[s.tipo]],['Cidade',s=>s.cidade||'Não informada'],...(selecionados.some(s=>s.tipo==='academia')?[['Distância em linha reta',s=>s.tipo!=='academia'?'—':distancia(s)==null?'Não disponível':`${distancia(s).toFixed(1)} km aprox. · em linha reta`]]:[]),[`Preço • ${periodos[periodo]}`,s=>moeda(s[`preco_${periodo}`])],['Especialidades',s=>s.especialidades.join(', ')||'Não informadas'],['Objetivos',s=>s.objetivos.join(', ')||'Não informados'],['Modalidades',s=>s.modalidades.join(', ')||'Não informadas'],['Atendimento',s=>s.atendimento.join(', ')||'Não informado'],['Horários informados',horario],['Novos alunos',s=>s.aceita_novos===null?'A consultar':s.aceita_novos?'Sim':'Não'],['Visita',s=>s.recebe_visitas?moeda(s.valor_visita):'Não oferecida'],['Aula experimental',s=>s.oferece_experimental?moeda(s.valor_experimental):'Não oferecida']];
 return <Modal titulo="Comparação de perfis" onClose={onClose}><p className="mb-4">Compare preços do mesmo período. Confirme os serviços inclusos e as condições com o prestador.</p><div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr><th className="p-3 text-left">Informação</th>{selecionados.map(s=><th key={s.id} className="p-3 min-w-48 text-left">{s.nome}</th>)}</tr></thead><tbody>{linhas.map(([l,fn])=><tr key={l} className="border-t border-neutral-500/30"><th className="p-3 text-left">{l}</th>{selecionados.map(s=><td key={s.id} className="p-3 align-top">{fn(s)}</td>)}</tr>)}</tbody></table></div></Modal>;
}
function Secao({titulo,children}){return <section className="border-t border-neutral-500/25 pt-5 space-y-3"><h3 className="text-lg font-bold">{titulo}</h3>{children}</section>;}
function Etiquetas({valores}){return <ul className="flex flex-wrap gap-2">{valores.filter(v=>typeof v==='string'&&v.trim()).map((v,i)=><li key={i} className="rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-sm">{v}</li>)}</ul>;}
export default function PerfilServico({perfil,conexao,onClose,ocupado,conectar,visitar,erro,mensagem,distancia}){
 const [interesse,setInteresse]=useState({objetivo:'',disponibilidade:[]});
 const academia=perfil.tipo==='academia',endereco=enderecoPublico(perfil);
 const fotos=[...new Set((perfil.fotos||[]).filter(fotoPublica))];
 const precos=Object.entries(periodos).filter(([k])=>perfil[`preco_${k}`]!=null&&perfil[`preco_${k}`]!==''&&Number.isFinite(Number(perfil[`preco_${k}`])));
 return <Modal titulo={perfil.nome} onClose={onClose} ocupado={ocupado}><div className="space-y-6">
  <header className="flex flex-col sm:flex-row gap-5 items-start">
   <FotoServico src={perfil.foto||fotos[0]} nome={perfil.nome} academia={academia} className={academia?'w-full sm:w-64 aspect-[4/3] rounded-2xl shrink-0':'w-28 h-28 rounded-2xl shrink-0'}/>
   <div className="min-w-0 space-y-3"><p className="text-sm text-sky-500 font-semibold">{tipos[perfil.tipo]}</p><h3 className="text-2xl font-bold break-words">{perfil.nome}</h3>
    {perfil.especialidades?.some(v=>v.trim())&&<Etiquetas valores={perfil.especialidades}/>}
    {perfil.cidade&&<p className="font-medium">{perfil.cidade}{perfil.estado?` · ${perfil.estado}`:''}</p>}
    <ContatosServico perfil={perfil}/>
   </div>
  </header>
  {academia&&fotos.length>0&&<Secao titulo="Fotos da academia"><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{fotos.map((f,i)=><FotoServico key={f} src={f} nome={`${perfil.nome}, foto ${i+1}`} academia className="w-full aspect-[4/3] rounded-xl"/>)}</div></Secao>}
  {perfil.descricao?.trim()&&<Secao titulo={academia?'Sobre a academia':'Sobre o profissional'}><p className="whitespace-pre-wrap break-words leading-relaxed">{perfil.descricao}</p></Secao>}
  {!academia&&perfil.formacao?.trim()&&<Secao titulo="Formação"><p className="whitespace-pre-wrap break-words leading-relaxed">{perfil.formacao}</p></Secao>}
  {[['servicos','Serviços'],['objetivos','Objetivos atendidos'],['modalidades','Modalidades'],['atendimento','Formas de atendimento']].map(([k,titulo])=>perfil[k]?.some(v=>v.trim())&&<Secao key={k} titulo={titulo}><Etiquetas valores={perfil[k]}/></Secao>)}
  {perfil.disponibilidade?.length>0&&<Secao titulo="Horários de atendimento"><ul className="space-y-2 text-sm">{perfil.disponibilidade.map((d,i)=><li key={i} className="border border-neutral-500/20 rounded-lg p-3">{horario({disponibilidade:[d]})}</li>)}</ul><p className="text-xs">Confirme a disponibilidade com o prestador.</p></Secao>}
  {academia&&(endereco||Number.isFinite(distancia))&&<Secao titulo="Localização">{endereco&&<p className="leading-relaxed">{endereco}</p>}{Number.isFinite(distancia)&&<div className="border border-neutral-500/30 rounded-xl p-3 w-fit"><p className="font-semibold">{distancia.toFixed(1)} km aproximadamente da sua localização</p><span translate="no" className="text-xs font-normal whitespace-nowrap">Em linha reta</span></div>}</Secao>}
  {precos.length>0&&<Secao titulo="Valores"><dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">{precos.map(([k,l])=><div key={k} className="border border-neutral-500/25 rounded-xl p-3"><dt className="text-sm">{l}</dt><dd className="font-bold text-lg mt-1">{moeda(perfil[`preco_${k}`])}</dd></div>)}</dl></Secao>}
  {perfil.condicoes?.trim()&&<Secao titulo="Condições de atendimento"><p className="whitespace-pre-wrap break-words">{perfil.condicoes}</p></Secao>}
  <ComercialAcademia perfil={perfil}/>
  {academia?(perfil.recebe_visitas||perfil.oferece_experimental)&&<Secao titulo="Conheça a academia"><div className="flex flex-wrap gap-3">{perfil.recebe_visitas&&<button className={botao} onClick={()=>visitar('visita')}>Solicitar visita</button>}{perfil.oferece_experimental&&<button className={botao} onClick={()=>visitar('experimental')}>Solicitar aula experimental</button>}</div></Secao>:<Secao titulo="Acompanhamento"><p className="text-sm">O profissional precisa aceitar sua solicitação. Depois, você escolhe quais dados compartilhar em Gerenciar conexões.</p>{!['pendente','aceito'].includes(conexao?.status)&&<InteresseConexao valor={interesse} setValor={setInteresse}/>}<button className={botao} disabled={ocupado||['pendente','aceito'].includes(conexao?.status)} onClick={()=>conectar(interesse)}>{conexao?.status==='aceito'?'Conexão já existente':conexao?.status==='pendente'?'Solicitação pendente':'Solicitar conexão'}</button></Secao>}
  {erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{mensagem&&<MensagemTemporaria as="p" role="status">{mensagem}</MensagemTemporaria>}
 </div></Modal>;
}
