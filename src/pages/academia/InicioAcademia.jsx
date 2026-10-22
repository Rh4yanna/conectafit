/* eslint-disable react/prop-types */
import {useEffect,useState} from 'react';
import {Users,Wallet,Calendar} from 'lucide-react';
const iconesIndicadores={alunos:Users,pagamentos:Wallet,agenda:Calendar};
import {Caixa,hoje,moeda} from './operacao-comum';
export default function InicioAcademia({api,dados,ativos,proximas,gestor,navegar}){
 const [resumo,setResumo]=useState(null),[erro,setErro]=useState('');
 useEffect(()=>{let ativo=true;const dia=hoje();Promise.all([api(`/agenda/periodo?inicio=${dia}&fim=${dia}`),gestor?api(`/financeiro?inicio=${dia.slice(0,7)}-01&fim=${dia}`):null]).then(([agenda,financeiro])=>{if(ativo)setResumo({agenda,financeiro});}).catch(e=>{if(ativo)setErro(e.message);});return()=>{ativo=false;};},[api,gestor,dados]);
 const movimentos=resumo?.financeiro?.lancamentos||[];
 return <><header><h1 className="text-3xl font-bold">Visão Geral</h1><p className="text-neutral-400 mt-2">Acompanhe as atividades e o desempenho da sua academia.</p></header>{erro&&<p role="alert">{erro}</p>}
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[['Alunos ativos',ativos.length,'alunos'],...(gestor?[['Receita mensal',resumo?moeda(movimentos.reduce((s,l)=>s+(l.tipo==='receita'?Number(l.valor):0),0)):'—','pagamentos']]:[]),['Agendamentos de hoje',resumo?.agenda.filter(a=>!a.cancelado).length??'—','agenda'],...(gestor?[['Mensalidades pendentes',dados.mensalidades.filter(m=>m.status!=='quitada').length,'pagamentos']]:[])].map(([label,valor,aba])=>{const Icon=iconesIndicadores[aba];return <button className="fit-stat bg-neutral-900 border border-neutral-500/30 rounded-2xl p-5 text-left" key={label} onClick={()=>navegar(aba)}><Icon aria-hidden="true"/><span className="text-sm text-neutral-400">{label}</span><strong className="block text-3xl mt-3 text-sky-400">{valor}</strong></button>})}</div>
 {gestor&&<p className="text-sm text-neutral-400">Receita: entradas registradas no caixa desde o início do mês até hoje. Estornos e despesas podem ser consultados no financeiro.</p>}
 <div className="grid lg:grid-cols-2 gap-5"><Caixa titulo="Agendamentos do dia">{!resumo?<p>{erro?'Agenda indisponível.':'Carregando agenda...'}</p>:resumo.agenda.filter(a=>!a.cancelado).length?resumo.agenda.filter(a=>!a.cancelado).map(a=><p key={a.chave}>{new Date(a.inicio).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})} · {a.titulo}</p>):<p>Nenhum agendamento para hoje.</p>}</Caixa>
 <Caixa titulo="Alunos recém-cadastrados">{[...dados.matriculas].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,5).map(m=><p key={m.id}>{m.aluno_nome} · {m.situacao}</p>)}{!dados.matriculas.length&&<p>Nenhum aluno cadastrado.</p>}</Caixa>
 {gestor&&<Caixa titulo="Movimentações recentes">{movimentos.slice(0,5).map(l=><p key={l.id}>{l.descricao} · {l.tipo} · {moeda(l.valor)}</p>)}{resumo&&!movimentos.length&&<p>Nenhuma movimentação neste mês.</p>}</Caixa>}
 <Caixa titulo="Alertas importantes"><button onClick={()=>navegar('alunos','renovacoes')} className="text-left text-sky-400">{proximas.length} matrículas próximas da renovação</button><p>Vencimentos nos próximos 30 dias.</p></Caixa></div></>;
}
