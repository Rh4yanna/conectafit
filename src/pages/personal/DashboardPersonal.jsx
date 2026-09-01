import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GerenciarPerfil from './GerenciarPerfil';
import AgendaPersonal from './AgendaPersonal';
import SolicitacoesConexao from './SolicitacoesConexao'; // IMPORTAÇÃO DAS SOLICITAÇÕES
import AlunosAtivos from './AlunosAtivos'; // IMPORTAÇÃO DOS ALUNOS ATIVOS
import { 
  Users, 
  Dumbbell, 
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
  LayoutDashboard, Sun, Moon
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function DashboardPersonal() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema_personal') !== 'claro');
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
    { id: 'agenda', label: 'Agenda Personal', icon: Calendar },
    { id: 'solicitacoes', label: 'Solicitações', icon: UserPlus },
    { id: 'alunos', label: 'Alunos Ativos', icon: Users },
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
              <div className="w-8 h-8 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-lg flex items-center justify-center font-bold">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">
                Conecta<span className="text-[#00AEFF]">Fit</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              Olá Personal <span className="text-[#00AEFF]">{nomeUsuario}</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Painel do Personal
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
                    ? 'bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF]' 
                      : 'border border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button type="button" onClick={() => { const novo = !temaEscuro; setTemaEscuro(novo); localStorage.setItem('tema_personal', novo ? 'escuro' : 'claro'); }} className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-800 text-sm font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white"><span className="flex items-center gap-3">{temaEscuro ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}{temaEscuro ? 'Modo claro' : 'Modo escuro'}</span></button>
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
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Alunos Ativos</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.alunos_ativos}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-[#00AEFF] rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Fichas Criadas</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.visitas}</h3>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Dumbbell className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Aulas Presenciais</p>
                  <h3 className="text-2xl font-black mt-1">{indicadores.compromissos_hoje} Hoje</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => alert('Montar nova ficha em breve!')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-[#00AEFF] rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-[#00AEFF]/10 text-[#00AEFF] rounded-2xl group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Criar Nova Ficha de Treino</h3>
                    <p className="text-xs text-neutral-400 mt-1">Prescreva séries, repetições e descansos para seus alunos</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-[#00AEFF]" />
              </button>

              <button 
                onClick={() => setAbaAtiva('solicitacoes')}
                className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-[#00AEFF] rounded-3xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Solicitações Pendentes</h3>
                    <p className="text-xs text-neutral-400 mt-1">Aceite novos pedidos de acompanhamento presencial ou remoto</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-[#00AEFF]" />
              </button>
            </div>

            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-base font-bold">Gerenciar Alunos</h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno..."
                    className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#00AEFF]"
                  />
                </div>
              </div>

              <div className="divide-y divide-neutral-800 text-sm">
                {[
                  { nome: 'Carlos Eduardo', objetivo: 'Hipertrofia', ultimaFicha: 'Há 2 dias' },
                  { nome: 'Mariana Silva', objetivo: 'Emagrecimento', ultimaFicha: 'Hoje' },
                  { nome: 'Lucas Gabriel', objetivo: 'Força & Condicionamento', ultimaFicha: 'Há 5 dias' },
                ].map((aluno, idx) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center font-bold text-neutral-300 text-xs">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{aluno.nome}</p>
                        <p className="text-xs text-neutral-400">{aluno.objetivo}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {aluno.ultimaFicha}
                      </span>
                      <button className="px-3 py-1.5 bg-neutral-950 hover:bg-[#00AEFF] hover:text-white border border-neutral-800 rounded-lg font-bold text-neutral-300 transition-colors">
                        Ver Treinos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* GERENCIAR PERFIL */}
        {abaAtiva === 'perfil' && <GerenciarPerfil />}

        {/* AGENDA PERSONAL */}
        {abaAtiva === 'agenda' && <AgendaPersonal />}

        {/* SOLICITAÇÕES DE CONEXÃO */}
        {abaAtiva === 'solicitacoes' && <SolicitacoesConexao />}

        {/* ALUNOS ATIVOS (A-Z) */}
        {abaAtiva === 'alunos' && <AlunosAtivos />}

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
                  ativo ? 'text-[#00AEFF]' : 'text-neutral-400 hover:text-white'
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
