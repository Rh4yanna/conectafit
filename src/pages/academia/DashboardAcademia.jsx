import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GerenciarPerfilAcademia from './GerenciarPerfilAcademia';
import { 
  Building2, 
  Dumbbell, 
  LogOut, 
  MoreVertical,
  X,
  LayoutDashboard,
  ChevronRight, Sun, Moon
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function DashboardAcademia() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema_academia') !== 'claro');
  const [visitas,setVisitas]=useState({visitas:0,visitas_mes:0});
  useEffect(()=>{apiFetch('/academia/dashboard').then(r=>r.json()).then(setVisitas).catch(()=>{})},[]);

  const getUsuarioLogado = () => {
    try {
      const item = localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario');
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  };

  const usuarioLogado = getUsuarioLogado();
  const nomeUsuario = usuarioLogado?.nome || 'Unidade';

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const menuItens = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'perfil', label: 'Perfil da Unidade', icon: Building2 },
  ];

  return (
    <div className={`min-h-screen ${temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 tema-claro'} font-sans antialiased pb-24 sm:pb-12 flex flex-col w-full`}>
      
      {/* NAVBAR SUPERIOR */}
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
              <div className="w-8 h-8 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-lg flex items-center justify-center font-bold">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">
                Conecta<span className="text-orange-400">Fit</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              Painel <span className="text-orange-400">{nomeUsuario}</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Gestão de Unidade
            </p>
          </div>

        </div>
      </header>

      {/* OVERLAY & SIDEBAR (DRAWER LATERAL) */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0e0e10] border-r border-neutral-800 p-4 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-lg text-white truncate">Gestão {nomeUsuario}</h2>
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
                    ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400' 
                      : 'border border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button type="button" onClick={() => { const novo = !temaEscuro; setTemaEscuro(novo); localStorage.setItem('tema_academia', novo ? 'escuro' : 'claro'); }} className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-800 text-sm font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white"><span className="flex items-center gap-3">{temaEscuro ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}{temaEscuro ? 'Modo claro' : 'Modo escuro'}</span></button>
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
          <div className="space-y-5"><div className="grid sm:grid-cols-2 gap-4"><div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl"><p className="text-xs text-neutral-400 uppercase font-bold">Visitas no perfil</p><p className="text-4xl font-black text-orange-400 mt-2">{visitas.visitas}</p></div><div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl"><p className="text-xs text-neutral-400 uppercase font-bold">Visitas neste mês</p><p className="text-4xl font-black text-orange-400 mt-2">{visitas.visitas_mes}</p></div></div>
          <button 
            onClick={() => setAbaAtiva('perfil')}
            className="w-full p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-orange-500 rounded-3xl flex items-center justify-between group transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-500/10 text-orange-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Configurar Perfil da Academia</h3>
                <p className="text-xs text-neutral-400 mt-1">Atualize CNPJ, endereço e informações institucionais</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-orange-400" />
          </button>
          </div>
        )}

        {/* GERENCIAR PERFIL */}
        {abaAtiva === 'perfil' && <GerenciarPerfilAcademia />}

      </main>

      {/* FOOTER NAVEGAÇÃO MOBILE */}
      <footer className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 z-40">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-around items-center">
          {menuItens.map((item) => {
            const Icon = item.icon;
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  ativo ? 'text-orange-400' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${ativo ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
