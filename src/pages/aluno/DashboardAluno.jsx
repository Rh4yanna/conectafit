import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, Utensils, LogOut, User, Sun, Moon, Search, 
  Menu, X, Link, UserCheck, Home, Compass, Activity, ChevronRight, Target, Ruler, Users
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function DashboardAluno() {
  const navigate = useNavigate();

  // Persistência de tema
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('temaEscuro');
    return temaSalvo !== null ? JSON.parse(temaSalvo) : true;
  });

  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [resumo, setResumo] = useState({ conexoes: 0, agua_meta: 2, agua_atual: 0, treinos_meta: 3, treinos_atual: 0, refeicoes_meta: 14, refeicoes_atual: 0 });

  // Leitura do usuário
  const [usuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || { 
        nome: 'Rhayanna Borges Tonete', 
        email: 'engs-rhayannatonete@camporeal.edu.br', 
        tipo_usuario: 'aluno' 
      };
    } catch {
      return { 
        nome: 'Rhayanna Borges Tonete', 
        email: 'engs-rhayannatonete@camporeal.edu.br', 
        tipo_usuario: 'aluno' 
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('temaEscuro', JSON.stringify(temaEscuro));
  }, [temaEscuro]);

  useEffect(() => { apiFetch('/aluno/resumo').then(r => r.ok ? r.json() : Promise.reject()).then(setResumo).catch(() => {}); }, []);

  // Fechar sidebar ao pressionar ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setSidebarAberta(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTema = () => setTemaEscuro((prev) => !prev);

  const proximoTreino = resumo.proximo_treino ? { ...resumo.proximo_treino, personal: resumo.proximo_treino.criado_por || 'Criado por você', duracao: '—', exerciciosCount: Array.isArray(resumo.proximo_treino.exercicios) ? resumo.proximo_treino.exercicios.length : 0 } : { titulo: 'Nenhum treino cadastrado', personal: 'CRIE OU RECEBA UM TREINO', duracao: '—', exerciciosCount: 0 };
  const proximaRefeicao = resumo.proxima_refeicao || { nome: 'Nenhuma refeição cadastrada', horario: '—', detalhes: 'Crie uma dieta ou conecte-se com um nutricionista.' };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 ${
      temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      
      {/* OVERLAY / MÁSCARA ESCURA QUANDO A SIDEBAR ESTÁ ABERTA */}
      {sidebarAberta && (
        <div 
          onClick={() => setSidebarAberta(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* SIDEBAR LATERAL (ESTILO EXATO DA TELA DE DIETAS) */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 z-50 flex flex-col justify-between p-4 border-r transition-transform duration-300 ease-in-out ${
        sidebarAberta ? 'translate-x-0' : '-translate-x-full'
      } ${
        temaEscuro ? 'bg-[#0e0e10] border-neutral-800/80 text-white' : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="space-y-6">
          {/* BOTÃO FECHAR */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarAberta(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PERFIL RESUMIDO DENTRO DA SIDEBAR */}
          <div 
            onClick={() => { setSidebarAberta(false); navigate('/aluno/perfil'); }}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              temaEscuro ? 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-xl flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold truncate">{usuario.nome}</p>
                <p className="text-[10px] text-neutral-400 truncate">{usuario.email}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>

          {/* LISTA DE NAVEGAÇÃO DA SIDEBAR */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => { setSidebarAberta(false); navigate('/aluno/perfil'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <UserCheck className="w-4.5 h-4.5 text-[#00AEFF]" />
              <span>Gerenciar Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => { setSidebarAberta(false); navigate('/aluno/treinos'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Dumbbell className="w-4.5 h-4.5 text-blue-400" />
              <span>Gerenciar Treinos</span>
            </button>

            <button
              type="button"
              onClick={() => { setSidebarAberta(false); navigate('/aluno/dietas'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Utensils className="w-4.5 h-4.5 text-emerald-400" />
              <span>Gerenciar Dietas</span>
            </button>

            <button
              type="button"
              onClick={() => { setSidebarAberta(false); navigate('/aluno/conexoes'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Link className="w-4.5 h-4.5 text-purple-400" />
              <span>Gerenciar Conexões</span>
            </button>

            <button type="button" onClick={() => { setSidebarAberta(false); navigate('/aluno/metas'); }} className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold ${temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300' : 'hover:bg-gray-100 text-gray-700'}`}><Target className="w-4 h-4 text-rose-400"/><span>Metas</span></button>
            <button type="button" onClick={() => { setSidebarAberta(false); navigate('/aluno/medidas'); }} className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold ${temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300' : 'hover:bg-gray-100 text-gray-700'}`}><Ruler className="w-4 h-4 text-cyan-400"/><span>Medidas e fotos</span></button>

            <div className={`my-2 border-t ${temaEscuro ? 'border-neutral-800/80' : 'border-gray-200'}`} />

            <button
              type="button"
              onClick={() => { setSidebarAberta(false); navigate('/aluno/servicos'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Search className="w-4.5 h-4.5 text-amber-400" />
              <span>Buscar Serviços</span>
            </button>

            <button
              type="button"
              onClick={toggleTema}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {temaEscuro ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
                <span>{temaEscuro ? 'Modo Claro' : 'Modo Escuro'}</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800/50 border border-neutral-700 text-neutral-400">
                {temaEscuro ? 'ESC' : 'CLA'}
              </span>
            </button>
          </nav>
        </div>

        {/* SAIR DA CONTA NO RODAPÉ DA SIDEBAR */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors mt-auto"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Sair da conta</span>
        </button>
      </aside>

      {/* CABEÇALHO PRINCIPAL */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
        temaEscuro ? 'bg-black/80 border-neutral-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          
          {/* BOTÃO HAMBÚRGUER / MENU */}
          <button
            type="button"
            onClick={() => setSidebarAberta(true)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
              temaEscuro
                ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* PERFIL */}
          <div 
            onClick={() => navigate('/aluno/perfil')}
            className="flex items-center gap-3 text-right cursor-pointer group p-1.5 rounded-2xl hover:bg-neutral-800/40 transition-all"
            title="Clique para gerenciar perfil"
          >
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight group-hover:text-[#00AEFF] transition-colors">
                Olá, <span className="text-[#00AEFF]">{usuario.nome}</span>!
              </h1>
              <p className={`text-[10px] sm:text-xs font-medium ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                Painel do Aluno
              </p>
            </div>
            <div className="w-10 h-10 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-2xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO DASHBOARD */}
      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Visão Geral</h2>
          <p className={`text-xs mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-600'}`}>
            Acompanhe seu progresso, próximas atividades e métricas diárias.
          </p>
        </div>

        {/* METRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <Dumbbell className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Semana</span>
            </div>
            <p className="text-2xl font-black">{resumo.treinos_atual} / {resumo.treinos_meta}</p>
            <p className={`text-[10px] mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>Treinos Concluídos</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <Utensils className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Meta</span>
            </div>
            <p className="text-2xl font-black">{resumo.refeicoes_atual} / {resumo.refeicoes_meta}</p>
            <p className={`text-[10px] mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>Refeições corretas</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Frequência</span>
            </div>
            <p className="text-2xl font-black">{resumo.agua_atual} L</p>
            <p className={`text-[10px] mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>Meta diária: {resumo.agua_meta} L</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Rede</span>
            </div>
            <p className="text-2xl font-black">{resumo.conexoes}</p>
            <p className={`text-[10px] mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>Conexões ativas</p>
          </div>
        </div>

        {/* PRÓXIMAS ATIVIDADES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`border rounded-3xl p-6 flex flex-col justify-between ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" /> Próximo Treino
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  Hoje
                </span>
              </div>

              <h3 className="text-lg font-bold">{proximoTreino.titulo}</h3>
              <p className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase mt-0.5">
                {proximoTreino.personal}
              </p>

              <div className={`mt-4 p-3 rounded-2xl border flex items-center justify-between text-xs ${
                temaEscuro ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <span>{proximoTreino.exerciciosCount} Exercícios agendados</span>
                <span className="font-bold">{proximoTreino.duracao}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/aluno/treinos')}
              className="w-full py-3 mt-6 font-bold text-xs rounded-xl bg-[#00AEFF] hover:bg-[#0099E0] text-white flex items-center justify-center gap-2 transition-all"
            >
              <span>Iniciar Treino</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className={`border rounded-3xl p-6 flex flex-col justify-between ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Próxima Refeição
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {proximaRefeicao.horario}
                </span>
              </div>

              <h3 className="text-lg font-bold">{proximaRefeicao.nome}</h3>
              <p className={`text-xs mt-2 ${temaEscuro ? 'text-neutral-300' : 'text-gray-600'}`}>
                {proximaRefeicao.detalhes}
              </p>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/aluno/dietas')}
              className="w-full py-3 mt-6 font-bold text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center gap-2 transition-all"
            >
              <span>Ver Dieta Completa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 p-4">
        <div className={`max-w-lg mx-auto rounded-full border backdrop-blur-xl shadow-2xl p-2 px-6 flex justify-between items-center transition-colors duration-300 ${
          temaEscuro 
            ? 'bg-neutral-900/90 border-neutral-800/80 text-neutral-400' 
            : 'bg-white/90 border-gray-200/80 text-gray-500'
        }`}>
          <button
            type="button"
            onClick={() => navigate('/aluno/dashboard')}
            className="flex flex-col items-center gap-1 text-[#00AEFF] transition-all hover:scale-110"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Início</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/treinos')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[10px] font-bold">Treinos</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/servicos')}
            className="flex flex-col items-center gap-1 -mt-5 bg-[#00AEFF] text-white p-3 rounded-full shadow-lg shadow-[#00AEFF]/30 transition-all hover:scale-110"
            title="Buscar Serviços"
          >
            <Compass className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/dietas')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-bold">Dietas</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/aluno/perfil')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Perfil</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
