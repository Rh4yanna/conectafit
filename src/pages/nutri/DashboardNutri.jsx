import MenuInferior from '../../components/MenuInferior';
import { useTelaInicialPronta } from '../../components/AberturaAplicacao';
import {Home} from 'lucide-react';
import Cabecalho from '../../components/Cabecalho';
import {useSearchParams} from 'react-router-dom';
import Notificacoes from '../../components/rotina/Notificacoes';
import { useTheme } from '../../context/ThemeContext';
import GerenciarPerfilNutri from './GerenciarPerfilNutri';
import SolicitacoesConexaoNutri from './SolicitacoesConexaoNutri';
import PacientesAtivos from './PacientesAtivos';
import AgendaPersonal from '../personal/AgendaPersonal';
import ModuloPacientesNutri from '../../components/alimentacao/ModuloPacientesNutri';
import {Users,Calendar,User,Utensils} from 'lucide-react';
import InicioNutri from '../../components/alimentacao/InicioNutri';

export default function DashboardNutri() {
  const [parametros,setParametros]=useSearchParams();
  const abaAtiva=['inicio','perfil','agenda','solicitacoes','pacientes','avisos','planos','anamnese','evolucao','avaliacoes','feedbacks','cobrancas','prontuario'].includes(parametros.get('aba'))?parametros.get('aba'):'inicio';
  const setAbaAtiva=v=>setParametros({aba:v});
  const {temaEscuro} = useTheme();
  useTelaInicialPronta(abaAtiva!=='inicio');

  const getUsuarioLogado = () => {
    try {
      const item = localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const usuarioLogado = getUsuarioLogado();
  const nomeUsuario = usuarioLogado?.nome || '';




  const menuItens = [{id:'inicio',label:'Início',icon:Home},{id:'pacientes',label:'Pacientes',icon:Users},{id:'planos',label:'Planos',icon:Utensils},{id:'agenda',label:'Agenda',icon:Calendar},{id:'perfil',label:'Perfil',icon:User}];
  return (
    <div data-menu-inferior className={`min-h-screen ${temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 tema-claro'} font-sans antialiased pb-28 flex flex-col`}>
      
      {/* NAVBAR */}
      <Cabecalho perfil="nutri" nome={nomeUsuario} menuItens={[["inicio","Início"],["pacientes","Meus pacientes"],["planos","Planos alimentares"],["anamnese","Anamnese"],["avaliacoes","Avaliações"],["evolucao","Evolução e fotos"],["feedbacks","Feedbacks"],["cobrancas","Cobranças"],["agenda","Agenda"],["prontuario","Prontuário nutricional"],["solicitacoes","Solicitações"],["perfil","Meu perfil"]]}/>

      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-8 flex-1">
        
        {abaAtiva === 'inicio' && <InicioNutri navegar={setAbaAtiva}/>}

        {/* GERENCIAR PERFIL */}
        {abaAtiva === 'perfil' && <GerenciarPerfilNutri />}
        {abaAtiva === 'agenda' && <AgendaPersonal nutri />}
        {abaAtiva === 'avisos' && <div className="p-5 lg:p-10"><Notificacoes profissional/></div>}

        {/* SOLICITAÇÕES DE CONEXÃO NUTRI */}
        {abaAtiva === 'solicitacoes' && <SolicitacoesConexaoNutri />}

        {/* PACIENTES ATIVOS (A-Z) */}
        {abaAtiva === 'pacientes' && <PacientesAtivos />}
        {['planos','anamnese','evolucao','avaliacoes','feedbacks','cobrancas','prontuario'].includes(abaAtiva)&&<ModuloPacientesNutri key={abaAtiva} modulo={abaAtiva}/>}

      </main>

      {/* FOOTER NAVEGAÇÃO MOBILE */}
      <MenuInferior label="Navegação do nutricionista">
          {menuItens.map((item) => {
            const Icon = item.icon;
            const ativo = abaAtiva === item.id;
            return (
              <button
                type="button"
                aria-current={ativo ? 'page' : undefined}
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  ativo ? 'text-sky-400' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${ativo ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-bold">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
      </MenuInferior>

    </div>
  );
}
