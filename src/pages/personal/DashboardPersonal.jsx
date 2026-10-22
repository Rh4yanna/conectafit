import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Home,Users,Calendar,User,Dumbbell} from 'lucide-react';
import Cabecalho from '../../components/Cabecalho';
import MenuInferior from '../../components/MenuInferior';
import Notificacoes from '../../components/rotina/Notificacoes';
import BibliotecaPersonal from '../../components/personal/BibliotecaPersonal';
import FeedbacksPersonal from '../../components/personal/FeedbacksPersonal';
import ModuloAlunoPersonal from '../../components/personal/ModuloAlunoPersonal';
import CobrancasPersonal from '../../components/personal/CobrancasPersonal';
import AvisosPersonal from '../../components/personal/AvisosPersonal';
import InicioPersonal from '../../components/personal/InicioPersonal';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import {useTelaInicialPronta} from '../../components/AberturaAplicacao';
import {useTheme} from '../../context/ThemeContext';
import {apiFetch} from '../../config/api';
import GerenciarPerfil from './GerenciarPerfil';
import AgendaPersonal from './AgendaPersonal';
import SolicitacoesConexao from './SolicitacoesConexao';
import AlunosAtivos from './AlunosAtivos';
const menu=[['inicio','Início'],['alunos','Meus Alunos'],['treinos','Treinos'],['feedbacks','Feedbacks'],['anamnese','Anamnese'],['avaliacoes','Avaliações'],['fotos','Fotos'],['agenda','Agenda'],['cobrancas','Cobranças'],['comunicados','Avisos'],['perfil','Meu Perfil'],['biblioteca','Biblioteca de exercícios'],['solicitacoes','Solicitações'],['avisos','Notificações']];
const atalhos=[['inicio','Início',Home],['alunos','Alunos',Users],['treinos','Treinos',Dumbbell],['agenda','Agenda',Calendar],['perfil','Perfil',User]];
export default function DashboardPersonal(){
 const [parametros,setParametros]=useSearchParams(),aba=menu.some(([id])=>id===parametros.get('aba'))?parametros.get('aba'):'inicio';
 const navegar=aba=>setParametros({aba});
 const {temaEscuro}=useTheme();
 const [alunos,setAlunos]=useState([]),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true),[tentativa,setTentativa]=useState(0);
 useTelaInicialPronta(aba!=='inicio'&&!carregando);
 useEffect(()=>{let ativo=true;setErro('');setCarregando(true);apiFetch('/profissional/alunos').then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar seus alunos.');const d=await r.json();if(ativo)setAlunos(d);}).catch(e=>{if(ativo){setErro(e.message);setAlunos([]);}}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[aba,tentativa]);
 let usuario;try{usuario=JSON.parse(localStorage.getItem('usuario')||'null');}catch{/* sessão validada pela rota */}
 const ativos=alunos.filter(a=>a.ativo);
 return <div data-menu-inferior className={`min-h-screen pb-28 flex flex-col ${temaEscuro?'bg-black text-white':'bg-gray-100 text-gray-900 tema-claro'}`}><Cabecalho perfil="personal" nome={usuario?.nome} menuItens={menu}/><main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 flex-1">
 {erro&&<><MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria><button className="acao-secundaria" onClick={()=>setTentativa(v=>v+1)}>Recarregar alunos</button></>}
 {aba==='inicio'&&<InicioPersonal navegar={navegar}/>}
 {aba==='perfil'&&<GerenciarPerfil/>}{aba==='agenda'&&<AgendaPersonal/>}{aba==='alunos'&&<AlunosAtivos/>}{aba==='solicitacoes'&&<SolicitacoesConexao/>}{aba==='biblioteca'&&<BibliotecaPersonal/>}{aba==='avisos'&&<Notificacoes profissional/>}
 {['treinos','anamnese','avaliacoes','fotos'].includes(aba)&&<ModuloAlunoPersonal key={aba} modulo={aba} alunos={ativos}/>}
 {aba==='feedbacks'&&<FeedbacksPersonal alunos={ativos}/>}{aba==='cobrancas'&&<CobrancasPersonal alunos={ativos}/>}{aba==='comunicados'&&<AvisosPersonal alunos={ativos}/>}
 </main><MenuInferior label="Navegação do personal">{atalhos.map(([id,l,Icon])=><button type="button" key={id} aria-current={id===aba?'page':undefined} onClick={()=>navegar(id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${id===aba?'text-sky-400 bg-sky-500/10':'text-neutral-400'}`}><Icon size={20}/><span className="text-xs font-bold">{l}</span></button>)}</MenuInferior></div>;
}
