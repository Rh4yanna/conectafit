import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GerenciarPerfilNutri from './GerenciarPerfilNutri';
import SolicitacoesConexaoNutri from './SolicitacoesConexaoNutri';
import PacientesAtivos from './PacientesAtivos';
import AgendaPersonal from '../personal/AgendaPersonal';
import { 
  Users, 
  Apple, 
  PlusCircle, 
  Calendar, 
  LogOut, 
  User, 
  Search, 
  ChevronRight,
  Clock,
  MoreVertical,
  UserPlus,
  X,
  LayoutDashboard,
  Utensils, Sun, Moon
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function DashboardNutri() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema_nutri') !== 'claro');
  const [indicadores,setIndicadores]=useState({alunos_ativos:0,solicitacoes_pendentes:0,visitas:0,compromissos_hoje:0});
  useEffect(()=>{apiFetch('/profissional/dashboard').then(r=>r.json()).then(setIndicadores).catch(()=>{})},[]);

  const getUsuarioLogado = () => {
    try {
      const item = localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario');
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  };

  const usuarioLogado = getUsuarioLogado();
  const nomeUsuario = usuarioLogado?.nome || '';

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const menuItens = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'perfil', label: 'Gerenciar Perfil', icon: User },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'solicitacoes', label: 'Solicitações', icon: UserPlus },
    { id: 'pacientes', label: 'Pacientes Ativos', icon: Users },
  ];

  return (
    <div className={`min-h-screen ${temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 tema-claro'} font-sans antialiased pb-24 sm:pb-12 flex flex-col`}>
      
      {/* NAVBAR */}
      <header className="bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-40">
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarAberta(true)}
              className="p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 transition-all active:scale-95"
              title="Menu de Opções"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center justify-center font-bold">
                <Apple className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">
                Conecta<span className="text-emerald-400">Nutri</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              Olá Nutri <span className="text-emerald-400">{nomeUsuario}</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Painel do Nutricionista
            </p>
          </div>

        </div>
      </header>

      {/* OVERLAY & SIDEBAR */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0e0e10] border-r border-neutral-800 p-4 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-lg text-white">Opções de {nomeUsuario}</h2>
            <button 
              onClick={() => setSidebarAberta(false)}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {menuItens.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setAbaAtiva(item.id);
                    setSidebarAberta(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    abaAtiva === item.id 
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
                      : 'border border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button type="button" onClick={() => { const novo = !temaEscuro; setTemaEscuro(novo); localStorage.setItem('tema_nutri', novo ? 'escuro' : 'claro'); }} className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-800 text-sm font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white"><span className="flex items-center gap-3">{temaEscuro ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}{temaEscuro ? 'Modo claro' : 'Modo escuro'}</span></button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-3 rounded-xl text-sm font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-8 flex-1">
        
        {abaAtiva === 'inicio' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pacientes Ativos</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.alunos_ativos}</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Planos Elaborados</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.visitas}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                  <Utensils className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Consultas Hoje</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.compromissos_hoje} Agendadas</h3>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => alert('Montar plano alimentar em breve!')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-emerald-500 rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Criar Plano Alimentar</h3>
                    <p className="text-xs text-neutral-400 mt-1">Monte dietas, macronutrientes e orientações</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-emerald-400" />
              </button>

              <button 
                onClick={() => setAbaAtiva('solicitacoes')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-emerald-500 rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Solicitações Pendentes</h3>
                    <p className="text-xs text-neutral-400 mt-1">Aceite novos pedidos de consulta ou acompanhamento</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-emerald-400" />
              </button>
            </div>

            {/* VISÃO RÁPIDA DE PACIENTES */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-base font-bold">Últimos Pacientes Atendidos</h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar paciente..."
                    className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-neutral-800 text-sm">
                {[
                  { nome: 'Camila Rocha', meta: 'Emagrecimento (-5kg)', ultimaDieta: 'Há 1 dia' },
                  { nome: 'Diego Martins', meta: 'Hipertrofia (3000 kcal)', ultimaDieta: 'Hoje' },
                  { nome: 'Juliana Paes', meta: 'Reeducação Alimentar', ultimaDieta: 'Há 4 dias' },
                ].map((paciente, idx) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {paciente.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{paciente.nome}</p>
                        <p className="text-xs text-neutral-400">{paciente.meta}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {paciente.ultimaDieta}
                      </span>
                      <button className="px-3 py-1.5 bg-neutral-950 hover:bg-emerald-500 hover:text-black border border-neutral-800 rounded-lg font-bold text-neutral-300 transition-colors">
                        Ver Plano
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* GERENCIAR PERFIL */}
        {abaAtiva === 'perfil' && <GerenciarPerfilNutri />}
        {abaAtiva === 'agenda' && <AgendaPersonal />}

        {/* SOLICITAÇÕES DE CONEXÃO NUTRI */}
        {abaAtiva === 'solicitacoes' && <SolicitacoesConexaoNutri />}

        {/* PACIENTES ATIVOS (A-Z) */}
        {abaAtiva === 'pacientes' && <PacientesAtivos />}

      </main>

      {/* FOOTER NAVEGAÇÃO MOBILE */}
      <footer className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 z-40">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-between items-center">
          {menuItens.map((item) => {
            const Icon = item.icon;
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  ativo ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${ativo ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-bold">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
