/* eslint-disable react/prop-types */
import {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {Menu, X, Sun, Moon, Activity, Home, User, Users, Dumbbell, Utensils, Calendar, Bell, Target, Camera, Compass, HeartPulse, Wallet, MessageSquare, ClipboardList, Package, BarChart3, DoorOpen, Building2} from 'lucide-react';
import {useTheme} from '../context/ThemeContext';
import {AvisoNotificacoes} from './rotina/Notificacoes';
import {Guia} from './ExperienciaCompartilhada';
import BotaoSair from './BotaoSair';

const menus = {
  aluno: [['dashboard','Início'],['perfil','Meu perfil'],['treinos','Treinos'],['dietas','Alimentação'],['conexoes','Conexões'],['metas','Metas'],['medidas','Medidas e fotos'],['servicos','Buscar serviços'],['rotina','Minha rotina']],
  personal: [['inicio','Início'],['perfil','Meu perfil'],['alunos','Alunos'],['biblioteca','Exercícios'],['agenda','Agenda'],['solicitacoes','Solicitações']],
  nutri: [['inicio','Início'],['perfil','Meu perfil'],['pacientes','Pacientes'],['agenda','Agenda'],['solicitacoes','Solicitações']],
  academia: [['inicio','Início'],['perfil','Perfil da academia'],['alunos','Alunos'],['planos','Planos'],['pagamentos','Financeiro'],['presenca','Presença'],['turmas','Turmas'],['equipe','Equipe'],['visitas','Visitas']],
};
const icones = {dashboard:Home,inicio:Home,perfil:User,alunos:Users,pacientes:Users,treinos:Dumbbell,biblioteca:Dumbbell,dietas:Utensils,agenda:Calendar,avisos:Bell,metas:Target,medidas:HeartPulse,avaliacoes:HeartPulse,fotos:Camera,servicos:Compass,conexoes:Users,rotina:Activity,anamnese:ClipboardList,cobrancas:Wallet,pagamentos:Wallet,financeiro:Wallet,comunicados:MessageSquare,solicitacoes:Users,planos:ClipboardList,presenca:DoorOpen,fluxo:DoorOpen,turmas:Users,equipe:Users,visitas:Compass,comercial:Compass,estoque:Package,vendas:Wallet,contas:Wallet,relatorios:BarChart3,estrutura:Building2};

export default function Cabecalho({perfil, nome, equipe=false, menuItens}) {
  const {temaEscuro, alternarTema}=useTheme();
  const [aberto,setAberto]=useState(false);
  const [ajudaAberta,setAjudaAberta]=useState(false);
  const dialog=useRef(null);
  const local=useLocation();
  const base=equipe?'/academia/equipe':`/${perfil}/dashboard`;
  const destino=aba=>perfil==='aluno'?`/aluno/${aba}`:`${base}?aba=${aba}`;
  const pagina=local.pathname.split('/').pop();
  const atual=perfil==='aluno'?pagina:new URLSearchParams(local.search).get('aba')||(['dashboard','equipe'].includes(pagina)?'inicio':pagina);
  const itens=menuItens||(equipe?[['inicio','Início']]:menus[perfil]);
  const links=()=>itens.map(([aba,label])=>{const Icon=icones[aba]||ClipboardList;return <Link key={aba} to={destino(aba)} aria-current={atual===aba?'page':undefined} onClick={()=>setAberto(false)} className="app-nav-link"><Icon size={19} aria-hidden="true"/><span>{label}</span></Link>;});
  useEffect(()=>{setAberto(false);},[local.pathname,local.search]);
  useEffect(()=>{if(aberto)dialog.current?.showModal();else dialog.current?.close();},[aberto]);
  const superficie=temaEscuro?'bg-neutral-950 text-white border-neutral-800':'bg-white text-gray-900 border-gray-200';
  return <>
    <aside className="app-sidebar" aria-label="Navegação lateral" aria-hidden={aberto||undefined} inert={aberto?'':undefined}>
      <Link to={destino(perfil==='aluno'?'dashboard':'inicio')} className="app-brand"><Activity aria-hidden="true"/><span>Conecta<span>Fit</span></span></Link>
      <p className="app-sidebar-caption">{equipe?'Equipe da academia':{aluno:'Seu espaço fitness',personal:'Espaço do personal',nutri:'Espaço da nutrição',academia:'Gestão da academia'}[perfil]}</p>
      <nav aria-label="Áreas do painel">{links()}</nav>
      <button type="button" className="app-sidebar-settings" onClick={()=>setAberto(true)}><Menu size={18} aria-hidden="true"/> Aparência, ajuda e conta</button>
    </aside>
    <header className={`app-cabecalho sticky top-0 z-40 border-b px-4 sm:px-8 py-4 flex items-center gap-3 ${superficie}`}>
      <button type="button" aria-label="Abrir menu" aria-expanded={aberto} onClick={()=>setAberto(true)} className="shrink-0 rounded-xl border border-neutral-500/25 p-3 hover:bg-neutral-500/10"><Menu size={20}/></button>
      <p className="min-w-0 flex-1 truncate font-semibold sm:text-lg">Olá, <span className="text-sky-500">{(perfil==='academia'?nome:nome?.split(' ')[0])||'bem-vindo'}</span>!</p>
      <AvisoNotificacoes profissional={perfil==='personal'||perfil==='nutri'} nutri={perfil==='nutri'} academia={perfil==='academia'} destino={equipe?`${base}?aba=avisos`:undefined}/>
    </header>
    <dialog ref={dialog} aria-label="Menu de navegação" onCancel={()=>setAberto(false)} onClose={()=>setAberto(false)} onClick={e=>{if(e.target===dialog.current)setAberto(false);}} className={`app-menu-dialog m-0 h-dvh max-h-none w-80 max-w-[90vw] border-r p-5 overflow-y-auto backdrop:bg-black/60 ${superficie}`}>
      <div className="flex justify-between items-center mb-5"><strong>ConectaFit</strong><button type="button" aria-label="Fechar menu" onClick={()=>setAberto(false)} className="p-2 rounded-xl hover:bg-neutral-500/10"><X/></button></div>
      <nav aria-label="Menu principal" className="space-y-1">{links()}</nav>
      <div className="border-t border-neutral-500/20 mt-5 pt-4 space-y-3">
        <button type="button" onClick={alternarTema} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-500/10">{temaEscuro?<Sun size={20}/>:<Moon size={20}/>} {temaEscuro?'Modo claro':'Modo escuro'}</button>
        <details onToggle={e=>setAjudaAberta(e.currentTarget.open)}><summary className="cursor-pointer p-3 rounded-xl hover:bg-neutral-500/10">Ajuda e minha conta</summary>{ajudaAberta&&<Guia/>}</details>
        <BotaoSair/>
      </div>
    </dialog>
  </>;
}
