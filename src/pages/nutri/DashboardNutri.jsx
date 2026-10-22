import MensagemTemporaria from '../../components/MensagemTemporaria';
import MenuInferior from '../../components/MenuInferior';
import { useTelaInicialPronta } from '../../components/AberturaAplicacao';
import {Home} from 'lucide-react';
import Cabecalho from '../../components/Cabecalho';
import {useSearchParams} from 'react-router-dom';
import Notificacoes from '../../components/rotina/Notificacoes';
import { useTheme } from '../../context/ThemeContext';
import { useEffect, useState } from 'react';
import GerenciarPerfilNutri from './GerenciarPerfilNutri';
import SolicitacoesConexaoNutri from './SolicitacoesConexaoNutri';
import PacientesAtivos from './PacientesAtivos';
import AgendaPersonal from '../personal/AgendaPersonal';
import { 
  Users, 
  PlusCircle, 
  Calendar, 
  User, 
  ChevronRight,
  
  UserPlus,
  
  
  Utensils,  } from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function DashboardNutri() {
  const [parametros,setParametros]=useSearchParams();
  const abaAtiva=['inicio','perfil','agenda','solicitacoes','pacientes','avisos'].includes(parametros.get('aba'))?parametros.get('aba'):'inicio';
  const setAbaAtiva=v=>setParametros({aba:v});
  const {temaEscuro} = useTheme();
  const [indicadores,setIndicadores]=useState({});
  const [erroIndicadores,setErroIndicadores]=useState(''),[revisao,setRevisao]=useState(0),[carregandoIndicadores,setCarregandoIndicadores]=useState(true);
  useTelaInicialPronta(!carregandoIndicadores);
  useEffect(()=>{let ativo=true;setCarregandoIndicadores(true);apiFetch('/profissional/dashboard').then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar os indicadores.');const d=await r.json();if(ativo){setIndicadores(d);setErroIndicadores('');}}).catch(e=>{if(ativo)setErroIndicadores(e.message);}).finally(()=>{if(ativo)setCarregandoIndicadores(false);});return()=>{ativo=false;};},[abaAtiva,revisao]);

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




  const menuItens = [{id:'inicio',label:'Início',icon:Home},{id:'pacientes',label:'Pacientes',icon:Users},{id:'agenda',label:'Agenda',icon:Calendar},{id:'solicitacoes',label:'Pedidos',icon:UserPlus},{id:'perfil',label:'Perfil',icon:User}];
  return (
    <div data-menu-inferior className={`min-h-screen ${temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 tema-claro'} font-sans antialiased pb-28 flex flex-col`}>
      
      {/* NAVBAR */}
      <Cabecalho perfil="nutri" nome={nomeUsuario}/>

      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-8 flex-1">
        
        {abaAtiva === 'inicio' && (
          <>
            {erroIndicadores&&<MensagemTemporaria as="p" role="alert">{erroIndicadores}</MensagemTemporaria>}{carregandoIndicadores&&<p role="status">Carregando indicadores...</p>}<button className="acao-secundaria" onClick={()=>setRevisao(n=>n+1)}>Atualizar indicadores</button><details className="text-sm"><summary className="cursor-pointer text-neutral-400">Sobre os indicadores</summary><p className="text-sm">Pacientes: conexões ativas. Visitas: total acumulado ao perfil. Consultas: atendimentos de hoje no horário de Brasília, incluindo pendentes de confirmação ou remarcação.</p></details><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="fit-stat bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pacientes Ativos</p>
                  <h3 className="text-2xl font-black mt-1">{carregandoIndicadores||erroIndicadores?'—':indicadores.alunos_ativos}</h3>
                </div>
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="fit-stat bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Visitas ao perfil</p>
                  <h3 className="text-2xl font-black mt-1">{carregandoIndicadores||erroIndicadores?'—':indicadores.visitas}</h3>
                </div>
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                  <Utensils className="w-6 h-6" />
                </div>
              </div>

              <div className="fit-stat bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Consultas Hoje</p>
                  <h3 className="text-2xl font-black mt-1">{carregandoIndicadores||erroIndicadores?'—':indicadores.compromissos_hoje} Agendadas</h3>
                </div>
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setAbaAtiva('pacientes')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-sky-500 rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Criar Plano Alimentar</h3>
                    <p className="text-xs text-neutral-400 mt-1">Selecione o paciente para montar refeições e orientações</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-sky-400" />
              </button>

              <button 
                onClick={() => setAbaAtiva('solicitacoes')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-sky-500 rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Solicitações Pendentes</h3>
                    <p className="text-xs text-neutral-400 mt-1">Aceite novos pedidos de consulta ou acompanhamento</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-sky-400" />
              </button>
            </div>

            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-3"><h2 className="text-base font-bold">Pacientes e acompanhamento</h2><p>Consulte registros autorizados, anamneses, planos e pendências dos seus pacientes.</p><button className="acao-secundaria" onClick={()=>setAbaAtiva('pacientes')}>Consultar pacientes e pendências</button></section>
          </>
        )}

        {/* GERENCIAR PERFIL */}
        {abaAtiva === 'perfil' && <GerenciarPerfilNutri />}
        {abaAtiva === 'agenda' && <AgendaPersonal />}
        {abaAtiva === 'avisos' && <div className="p-5 lg:p-10"><Notificacoes profissional/></div>}

        {/* SOLICITAÇÕES DE CONEXÃO NUTRI */}
        {abaAtiva === 'solicitacoes' && <SolicitacoesConexaoNutri />}

        {/* PACIENTES ATIVOS (A-Z) */}
        {abaAtiva === 'pacientes' && <PacientesAtivos />}

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
