import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import { 
  Dumbbell, Utensils, LogOut, User, Sun, Moon, Search, 
  MoreVertical, Link, UserCheck, Home, Compass, Clock, 
  ChevronDown, ChevronUp, ChevronRight, X, Plus, Trash2 
} from 'lucide-react';

export default function MinhaDieta() {
  const navigate = useNavigate();

  // Persistência de tema
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('temaEscuro');
    return temaSalvo !== null ? JSON.parse(temaSalvo) : true;
  });

  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  // Leitura do usuário
  const [usuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || { 
        nome: 'Rhayanna Borges Tonete', 
        email: 'engs-rhayannatonete@camporea...', 
        tipo_usuario: 'aluno' 
      };
    } catch {
      return { nome: 'Rhayanna Borges Tonete', email: 'engs-rhayannatonete@camporea...', tipo_usuario: 'aluno' };
    }
  });

  const [refeicaoAberta, setRefeicaoAberta] = useState(null);
  const [dietas, setDietas] = useState([]);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [refeicoesForm, setRefeicoesForm] = useState([{ nome: '', horario: '', alimento: '', quantidade_gramas: '' }]);
  const [criandoDieta, setCriandoDieta] = useState(false);
  const [erroDieta, setErroDieta] = useState('');
  const [dietaParaExcluir, setDietaParaExcluir] = useState(null);
  const [excluindoDieta, setExcluindoDieta] = useState(false);

  const normalizarDieta = (dieta) => ({
    ...dieta,
    metaCalorica: dieta.meta_calorias ? `${dieta.meta_calorias} kcal` : 'Sem meta calórica',
    refeicoes: Array.isArray(dieta.refeicoes) ? dieta.refeicoes : []
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${API_URL}/dietas/minha`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (response.status === 401) throw new Error('Sessão expirada');
        if (!response.ok) throw new Error('Não foi possível carregar as dietas');
        return response.json();
      })
      .then((dados) => setDietas(dados.map(normalizarDieta)))
      .catch((error) => {
        console.error(error);
        if (error.message === 'Sessão expirada') navigate('/login', { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('temaEscuro', JSON.stringify(temaEscuro));
  }, [temaEscuro]);

  // Fechar ao clicar fora ou ESC
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuAberto(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTema = () => setTemaEscuro((prev) => !prev);

  const toggleRefeicao = (id) => {
    setRefeicaoAberta(refeicaoAberta === id ? null : id);
  };

  const criarDieta = async (event) => {
    event.preventDefault();
    if (!novoTitulo.trim()) return;
    const token = localStorage.getItem('token');
    setCriandoDieta(true);
    setErroDieta('');
    try {
      const response = await fetch(`${API_URL}/dietas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titulo: novoTitulo.trim() })
      });
      if (!response.ok) {
        const dados = await response.json().catch(() => ({}));
        throw new Error(dados.message || 'Não foi possível criar a dieta.');
      }
      const dietaCriada = normalizarDieta(await response.json());
      const refeicoesCriadas = await Promise.all(refeicoesForm.map(async (refeicao) => {
        const resposta = await fetch(`${API_URL}/dietas/${dietaCriada.id}/refeicoes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(refeicao)
        });
        if (!resposta.ok) {
          const dados = await resposta.json().catch(() => ({}));
          throw new Error(dados.message || 'Não foi possível salvar uma refeição.');
        }
        return resposta.json();
      }));
      dietaCriada.refeicoes = refeicoesCriadas;
      setDietas((anteriores) => [dietaCriada, ...anteriores]);
      setNovoTitulo('');
      setRefeicoesForm([{ nome: '', horario: '', alimento: '', quantidade_gramas: '' }]);
      setModalCriarAberto(false);
    } catch (error) {
      setErroDieta(error.message);
    } finally {
      setCriandoDieta(false);
    }
  };

  const excluirDieta = async () => {
    if (!dietaParaExcluir) return;
    setExcluindoDieta(true);
    try {
      const response = await fetch(`${API_URL}/dietas/${dietaParaExcluir.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Não foi possível excluir o plano.');
      setDietas((anteriores) => anteriores.filter((dieta) => dieta.id !== dietaParaExcluir.id));
      setDietaParaExcluir(null);
    } catch (error) {
      setErroDieta(error.message);
      setDietaParaExcluir(null);
    } finally {
      setExcluindoDieta(false);
    }
  };

  // Dados mockados da Dieta
  const dietasExemplo = [
    {
      id: 1,
      titulo: 'Plano Alimentar - Hipertrofia',
      nutricionista: 'DRA. PATRÍCIA LIMA (NUTRI)',
      metaCalorica: '2600 kcal',
      refeicoes: [
        { id: 101, nome: 'Café da Manhã', horario: '08:00', detalhes: '3 ovos mexidos, 2 fatias de pão integral, 100g de mamão e café sem açúcar.' },
        { id: 102, nome: 'Almoço', horario: '12:00', detalhes: '150g de frango grelhado, 180g de arroz integral, feijão e salada à vontade.' },
        { id: 103, nome: 'Lanche da Tarde', horario: '16:00', detalhes: '30g de Whey Protein, 1 banana, 30g de aveia e 15g de pasta de amendoim.' }
      ]
    },
    {
      id: 2,
      titulo: 'Dieta Fim de Semana / Manutenção',
      metaCalorica: '2100 kcal',
      refeicoes: [
        { id: 201, nome: 'Café da Manhã', horario: '09:00', detalhes: 'Panqueca de banana (1 banana, 2 ovos, 30g aveia).' },
        { id: 202, nome: 'Almoço', horario: '13:00', detalhes: '150g de filé de peixe, 150g de purê de batata e salada verde.' },
        { id: 203, nome: 'Jantar', horario: '19:30', detalhes: 'Omelete de 3 ovos com queijo branco e tomate.' }
      ]
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 ${
      temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      
      {/* OVERLAY DE FUNDO */}
      {menuAberto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* SIDEBAR LATERAL DA ESQUERDA */}
      <aside 
        ref={menuRef}
        className={`fixed top-0 left-0 h-full w-80 z-50 p-4 transition-transform duration-300 flex flex-col justify-between overflow-y-auto ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        } ${
          temaEscuro ? 'bg-neutral-900 border-r border-neutral-800 text-white' : 'bg-white border-r border-gray-200 text-gray-900'
        }`}
      >
        <div className="space-y-6">
          {/* BOTÃO FECHAR */}
          <div className="flex justify-start">
            <button 
              type="button" 
              onClick={() => setMenuAberto(false)}
              className={`p-2 rounded-xl transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CARD PERFIL NO TOPO */}
          <div 
            onClick={() => { setMenuAberto(false); navigate('/aluno/perfil'); }}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
              temaEscuro ? 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 min-w-[40px] bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-xl flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold truncate">{usuario.nome}</h4>
                <p className={`text-[10px] truncate ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  {usuario.email}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 min-w-[16px]" />
          </div>

          {/* LISTA DE OPÇÕES EXATAS DO DASHBOARD */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => { setMenuAberto(false); navigate('/aluno/perfil'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#00AEFF]" />
              <span>Gerenciar Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => { setMenuAberto(false); navigate('/aluno/treinos'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Dumbbell className="w-4 h-4 text-blue-400" />
              <span>Gerenciar Treinos</span>
            </button>

            <button
              type="button"
              onClick={() => { setMenuAberto(false); navigate('/aluno/dietas'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}
            >
              <div className="flex items-center gap-3">
                <Utensils className="w-4 h-4 text-emerald-400" />
                <span>Gerenciar Dietas</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>

            <button
              type="button"
              onClick={() => { setMenuAberto(false); navigate('/aluno/conexoes'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Link className="w-4 h-4 text-purple-400" />
              <span>Gerenciar Conexões</span>
            </button>

            <div className={`my-2 border-t ${temaEscuro ? 'border-neutral-800' : 'border-gray-200'}`} />

            <button
              type="button"
              onClick={() => { setMenuAberto(false); navigate('/aluno/servicos'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>Buscar Serviços</span>
            </button>

            <button
              type="button"
              onClick={toggleTema}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                temaEscuro ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {temaEscuro ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                <span>{temaEscuro ? 'Modo Claro' : 'Modo Escuro'}</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
                {temaEscuro ? 'ESC' : 'CLA'}
              </span>
            </button>
          </nav>
        </div>

        {/* BOTÃO SAIR NO RODAPÉ */}
        <div className={`pt-4 border-t ${temaEscuro ? 'border-neutral-800' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* CABEÇALHO */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
        temaEscuro ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
              temaEscuro
                ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Abrir Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

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

      {/* CONTEÚDO PRINCIPAL - DIETAS */}
      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Meus Planos Alimentares</h2>
            <p className={`text-xs mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-600'}`}>
              Monte seus planos de alimentação diários ou acompanhe as diretrizes do seu Nutricionista.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => { setErroDieta(''); setNovoTitulo(''); setRefeicoesForm([{ nome: '', horario: '', alimento: '', quantidade_gramas: '' }]); setModalCriarAberto(true); }}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm px-5 py-3 rounded-xl flex items-center gap-2 self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Dieta</span>
          </button>
        </div>

        {/* CARDS DAS DIETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dietas.map((dieta) => (
            <div 
              key={dieta.id}
              className={`border rounded-3xl p-6 transition-all flex flex-col justify-between ${
                temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{dieta.titulo}</h3>
                    {dieta.nutricionista && (
                      <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                        {dieta.nutricionista}
                      </span>
                    )}
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                    {dieta.metaCalorica}
                  </span>
                  <button type="button" onClick={() => setDietaParaExcluir(dieta)} className="p-2 rounded-xl text-red-400 hover:bg-red-500/10" title="Excluir plano"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3 my-4">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                    Refeições ({dieta.refeicoes.length})
                  </span>

                  {dieta.refeicoes.map((ref) => {
                    const estaAberto = refeicaoAberta === ref.id;
                    return (
                      <div 
                        key={ref.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          temaEscuro ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRefeicao(ref.id)}
                          className="w-full p-3.5 flex items-center justify-between text-left"
                        >
                          <span className="text-xs font-bold">{ref.nome}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`flex items-center gap-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                              <Clock className="w-3.5 h-3.5" />
                              {ref.horario}
                            </span>
                            {estaAberto ? (
                              <ChevronUp className="w-4 h-4 text-neutral-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                        </button>

                        {estaAberto && (
                          <div className={`p-3 text-xs border-t ${
                            temaEscuro ? 'border-neutral-800/60 text-neutral-300' : 'border-gray-200 text-gray-700'
                          }`}>
                            <p>{ref.detalhes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                type="button"
                className="w-full py-3 mt-4 font-bold text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center gap-2 transition-all"
              >
                <Utensils className="w-4 h-4" />
                <span>Ver Cardápio Completo</span>
              </button>
            </div>
          ))}
        </div>

      </main>

      {modalCriarAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={criarDieta} className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 space-y-5 ${temaEscuro ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-xl font-black">Novo plano alimentar</h3><p className="text-sm mt-1 text-neutral-400">Crie um plano para organizar suas refeições.</p></div>
              <button type="button" onClick={() => setModalCriarAberto(false)} className="p-2 rounded-xl hover:bg-neutral-800"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-neutral-400">Nome do plano</label>
              <input autoFocus required maxLength="120" value={novoTitulo} onChange={(event) => setNovoTitulo(event.target.value)} placeholder="Ex: Plano para hipertrofia" className={`w-full p-3 rounded-xl border outline-none text-base ${temaEscuro ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-gray-50 border-gray-300'}`} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><label className="text-xs font-bold uppercase text-neutral-400">Refeições e quantidades</label><button type="button" onClick={() => setRefeicoesForm((anteriores) => [...anteriores, { nome: '', horario: '', alimento: '', quantidade_gramas: '' }])} className="text-sm font-bold text-emerald-400">+ Adicionar refeição</button></div>
              {refeicoesForm.map((refeicao, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_110px_auto] gap-2 rounded-2xl border border-neutral-800 p-3 bg-neutral-950/60">
                  <input required value={refeicao.nome} onChange={(event) => setRefeicoesForm((anteriores) => anteriores.map((item, i) => i === index ? { ...item, nome: event.target.value } : item))} placeholder="Refeição (ex: Café)" className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm" />
                  <input type="time" value={refeicao.horario} onChange={(event) => setRefeicoesForm((anteriores) => anteriores.map((item, i) => i === index ? { ...item, horario: event.target.value } : item))} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm" />
                  <input required value={refeicao.alimento} onChange={(event) => setRefeicoesForm((anteriores) => anteriores.map((item, i) => i === index ? { ...item, alimento: event.target.value } : item))} placeholder="Alimento" className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm" />
                  <input required min="1" max="5000" type="number" value={refeicao.quantidade_gramas} onChange={(event) => setRefeicoesForm((anteriores) => anteriores.map((item, i) => i === index ? { ...item, quantidade_gramas: event.target.value } : item))} placeholder="Gramas" className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm" />
                  {refeicoesForm.length > 1 && <button type="button" onClick={() => setRefeicoesForm((anteriores) => anteriores.filter((_, i) => i !== index))} className="px-3 py-2 text-red-400 text-sm font-bold">Remover</button>}
                </div>
              ))}
            </div>
            {erroDieta && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{erroDieta}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModalCriarAberto(false)} className="px-5 py-3 rounded-xl text-sm font-bold bg-neutral-800 text-neutral-200">Cancelar</button>
              <button disabled={criandoDieta} className="px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-black disabled:opacity-60">{criandoDieta ? 'Criando...' : 'Criar plano'}</button>
            </div>
          </form>
        </div>
      )}

      {dietaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-5 ${temaEscuro ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div><h3 className="text-xl font-black">Excluir plano?</h3><p className="text-sm mt-2 text-neutral-400">“{dietaParaExcluir.titulo}” e suas refeições serão removidos.</p></div>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setDietaParaExcluir(null)} className="px-5 py-3 rounded-xl text-sm font-bold bg-neutral-800 text-neutral-200">Cancelar</button><button type="button" disabled={excluindoDieta} onClick={excluirDieta} className="px-5 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">{excluindoDieta ? 'Excluindo...' : 'Excluir'}</button></div>
          </div>
        </div>
      )}

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
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
              temaEscuro ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
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
            className="flex flex-col items-center gap-1 text-emerald-400 transition-all hover:scale-110"
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
