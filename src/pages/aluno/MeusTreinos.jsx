import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Plus,
  Trash2,
  Edit3,
  UserCheck,
  Play,
  Menu,
  Utensils,
  User,
  Sun,
  Moon,
  LogOut,
  X,
  Search,
  Link2,
  Home,
  Compass,
  ChevronRight,
  Loader2,
  CheckCircle2
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");

export default function MeusTreinos() {
  const navigate = useNavigate();

  // TEMA
  const [temaEscuro, setTemaEscuro] = useState(true);
  const toggleTema = () => setTemaEscuro((prev) => !prev);

  // ESTADOS PRINCIPAIS
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [treinoAtivo, setTreinoAtivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carregandoTreinos, setCarregandoTreinos] = useState(true);

  // ESTADOS DE DADOS
  const [usuario, setUsuario] = useState({
    id: 1, // ID padrão para teste caso o backend não retorne nada
    nome: "Aluno Teste",
    email: "teste@email.com",
    tipo_usuario: "aluno",
  });
  const [treinos, setTreinos] = useState([]);

  // CONFIGURAÇÃO SIMPLES SEM TOKEN
  const getFetchConfig = (method = "GET", body = null) => {
    const token = localStorage.getItem("token");
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return config;
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // 1. CARREGAR DADOS DO USUÁRIO E TREINOS (SEM BLOQUEIO POR 401)
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregandoTreinos(true);
      try {
        // Tenta carregar usuário
        const resUser = await fetch(`${API_URL}/usuario/me`, getFetchConfig("GET")).catch(() => null);
        if (resUser?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login", { replace: true });
          return;
        }
        if (resUser && resUser.ok) {
          const usuarioCarregado = await resUser.json();
          setUsuario(usuarioCarregado);
        }

        // Tenta carregar treinos
        const resTreinos = await fetch(`${API_URL}/treinos`, getFetchConfig("GET")).catch(() => null);
        if (resTreinos?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login", { replace: true });
          return;
        }
        if (resTreinos && resTreinos.ok) {
          const dataTreinos = await resTreinos.json();
          setTreinos(Array.isArray(dataTreinos) ? dataTreinos : []);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do backend:", error);
      } finally {
        setCarregandoTreinos(false);
      }
    };

    carregarDadosIniciais();
  }, []);

  // FECHAR MODAIS COM ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSidebarAberta(false);
        setModalAberto(false);
        setTreinoAtivo(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // FORMULÁRIO DE CRIAR/EDITAR
  const [idEditando, setIdEditando] = useState(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [exerciciosForm, setExerciciosForm] = useState([
    { nome: "", series: "3", repeticoes: "12", carga: "" },
  ]);

  const handleLogout = () => {
    navigate("/login");
  };

  // AÇÕES DO FORMULÁRIO
  const adicionarExercicioForm = () => {
    setExerciciosForm([
      ...exerciciosForm,
      { nome: "", series: "3", repeticoes: "12", carga: "" },
    ]);
  };

  const removerExercicioForm = (index) => {
    if (exerciciosForm.length > 1) {
      setExerciciosForm(exerciciosForm.filter((_, i) => i !== index));
    }
  };

  const handleExercicioChange = (index, campo, valor) => {
    const novos = exerciciosForm.map((item, i) => {
      if (i === index) {
        return { ...item, [campo]: valor };
      }
      return item;
    });
    setExerciciosForm(novos);
  };

  const abrirModalNovoTreino = () => {
    setIdEditando(null);
    setNovoTitulo("");
    setExerciciosForm([{ nome: "", series: "3", repeticoes: "12", carga: "" }]);
    setModalAberto(true);
  };

  const abrirModalEditarTreino = (treino) => {
    setIdEditando(treino.id);
    setNovoTitulo(treino.titulo || "");

    let exList = treino.exercicios;
    if (typeof exList === "string") {
      try {
        exList = JSON.parse(exList);
      } catch {
        exList = [];
      }
    }
    setExerciciosForm(
      Array.isArray(exList) && exList.length > 0
        ? JSON.parse(JSON.stringify(exList))
        : [{ nome: "", series: "3", repeticoes: "12", carga: "" }]
    );
    setModalAberto(true);
  };

  // 2. SALVAR TREINO SEM REQUERER TOKEN
  const salvarTreino = async (e) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const exerciciosFiltrados = exerciciosForm.filter(
      (ex) => ex.nome.trim() !== ""
    );

    if (exerciciosFiltrados.length === 0) {
      alert("Adicione pelo menos um exercício com nome válido.");
      return;
    }

    setLoading(true);

    const payload = {
      titulo: novoTitulo.trim(),
      exercicios: exerciciosFiltrados,
    };

    try {
      if (idEditando) {
        const response = await fetch(
          `${API_URL}/treinos/${idEditando}`,
          getFetchConfig("PUT", payload)
        );

        if (response.ok) {
          const { treino: treinoAtualizado } = await response.json();
          setTreinos(
            (anteriores) => anteriores.map((t) => (t.id === idEditando ? treinoAtualizado : t))
          );
          setModalAberto(false);
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Erro do servidor (${response.status}): ${errData.message || errData.error || "Erro ao atualizar."}`);
        }
      } else {
        const response = await fetch(
          `${API_URL}/treinos`,
          getFetchConfig("POST", payload)
        );

        if (response.ok) {
          const { treino: treinoCriado } = await response.json();
          setTreinos((anteriores) => [treinoCriado, ...anteriores]);
          setModalAberto(false);
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Erro do servidor (${response.status}): ${errData.message || errData.error || "Erro ao salvar."}`);
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Erro ao conectar com a API Backend.");
    } finally {
      setLoading(false);
    }
  };

  // 3. DELETAR TREINO
  const deletarTreino = async (id) => {
    if (!window.confirm("Deseja realmente excluir este treino?")) return;

    try {
      const response = await fetch(
        `${API_URL}/treinos/${id}`,
        getFetchConfig("DELETE")
      );

      if (response.ok) {
        setTreinos((anteriores) => anteriores.filter((t) => t.id !== id));
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Erro ao remover: ${errData.message || "Erro no servidor."}`);
      }
    } catch (error) {
      console.error("Erro ao deletar treino:", error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const parseExercicios = (exercicios) => {
    if (typeof exercicios === "string") {
      try {
        return JSON.parse(exercicios);
      } catch {
        return [];
      }
    }
    return Array.isArray(exercicios) ? exercicios : [];
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 ${
        temaEscuro ? "bg-black text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* OVERLAY SIDEBAR */}
      {sidebarAberta && (
        <div
          onClick={() => setSidebarAberta(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* SIDEBAR LATERAL */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 z-50 flex flex-col justify-between p-4 border-r transition-transform duration-300 ease-in-out ${
          sidebarAberta ? "translate-x-0" : "-translate-x-full"
        } ${
          temaEscuro
            ? "bg-[#0e0e10] border-neutral-800/80 text-white"
            : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarAberta(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={() => {
              setSidebarAberta(false);
              navigate("/aluno/perfil");
            }}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              temaEscuro
                ? "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
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

          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setSidebarAberta(false);
                navigate("/aluno/perfil");
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro
                  ? "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <UserCheck className="w-4.5 h-4.5 text-[#00AEFF]" />
              <span>Gerenciar Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarAberta(false)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold border transition-all ${
                temaEscuro
                  ? "bg-neutral-900/90 border-neutral-800 text-white"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-4.5 h-4.5 text-blue-400" />
                <span>Gerenciar Treinos</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarAberta(false);
                navigate("/aluno/dietas");
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro
                  ? "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Utensils className="w-4.5 h-4.5 text-emerald-400" />
              <span>Gerenciar Dietas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarAberta(false);
                navigate("/aluno/conexoes");
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro
                  ? "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Link2 className="w-4.5 h-4.5 text-purple-400" />
              <span>Gerenciar Conexões</span>
            </button>

            <div
              className={`my-2 border-t ${
                temaEscuro ? "border-neutral-800/80" : "border-gray-200"
              }`}
            />

            <button
              type="button"
              onClick={() => {
                setSidebarAberta(false);
                navigate("/aluno/servicos");
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro
                  ? "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Search className="w-4.5 h-4.5 text-amber-400" />
              <span>Buscar Serviços</span>
            </button>

            <button
              type="button"
              onClick={toggleTema}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                temaEscuro
                  ? "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {temaEscuro ? (
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-indigo-500" />
                )}
                <span>{temaEscuro ? "Modo Claro" : "Modo Escuro"}</span>
              </div>
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors mt-auto"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Sair da conta</span>
        </button>
      </aside>

      {/* HEADER */}
      <header
        className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
          temaEscuro
            ? "bg-black/80 border-neutral-800"
            : "bg-white/90 border-gray-200"
        }`}
      >
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          <button
            type="button"
            onClick={() => setSidebarAberta(true)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
              temaEscuro
                ? "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => navigate("/aluno/perfil")}
            className="flex items-center gap-3 text-right cursor-pointer group p-1.5 rounded-2xl hover:bg-neutral-800/40 transition-all"
          >
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight group-hover:text-[#00AEFF] transition-colors">
                Olá, <span className="text-[#00AEFF]">{usuario.nome}</span>!
              </h1>
              <p
                className={`text-[10px] sm:text-xs font-medium ${
                  temaEscuro ? "text-neutral-400" : "text-gray-500"
                }`}
              >
                Painel do Aluno
              </p>
            </div>
            <div className="w-10 h-10 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-2xl flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-none px-5 lg:px-10 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Meus Treinos</h1>
            <p
              className={`text-xs mt-1 ${
                temaEscuro ? "text-neutral-400" : "text-gray-600"
              }`}
            >
              Crie e gerencie suas rotinas de treino sem restrição.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalNovoTreino}
            className="px-4 py-3 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00AEFF]/20 flex items-center gap-2 shrink-0 justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Treino</span>
          </button>
        </div>

        {/* LISTA OU LOADING */}
        {carregandoTreinos ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#00AEFF] animate-spin" />
            <p className="text-xs text-neutral-400">Carregando treinos...</p>
          </div>
        ) : treinos.length === 0 ? (
          <div
            className={`border rounded-3xl p-12 text-center space-y-3 ${
              temaEscuro
                ? "bg-neutral-900/50 border-neutral-800"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#00AEFF]/10 border border-[#00AEFF]/20 text-[#00AEFF] flex items-center justify-center mx-auto">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">Nenhum treino cadastrado</h3>
            <p
              className={`text-xs max-w-sm mx-auto ${
                temaEscuro ? "text-neutral-400" : "text-gray-500"
              }`}
            >
              Clique no botão acima para criar o seu primeiro treino!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {treinos.map((treino) => {
              const exList = parseExercicios(treino.exercicios);

              return (
                <div
                  key={treino.id}
                  className={`border rounded-3xl p-6 transition-all flex flex-col justify-between ${
                    temaEscuro
                      ? "bg-neutral-900 border-neutral-800"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                            treino.origem === "personal"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-[#00AEFF]/10 text-[#00AEFF] border border-[#00AEFF]/20"
                          }`}
                        >
                          <Dumbbell className="w-3 h-3" />
                          <span>{treino.criado_por || "Aluno"}</span>
                        </span>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          {treino.titulo}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirModalEditarTreino(treino)}
                          className={`p-2 rounded-xl border transition-all ${
                            temaEscuro
                              ? "hover:bg-neutral-800 border-neutral-800 text-neutral-400"
                              : "hover:bg-gray-100 border-gray-200 text-gray-600"
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletarTreino(treino.id)}
                          className="p-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p
                        className={`text-[11px] font-bold uppercase ${
                          temaEscuro ? "text-neutral-400" : "text-gray-500"
                        }`}
                      >
                        Exercícios ({exList.length})
                      </p>

                      <div className="space-y-1.5">
                        {exList.slice(0, 3).map((ex, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                              temaEscuro
                                ? "bg-neutral-950/60 border-neutral-800/80"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span className="truncate pr-2">{ex.nome}</span>
                            <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold text-[#00AEFF]">
                              <span>
                                {ex.series}x {ex.repeticoes}
                              </span>
                              {ex.carga && (
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    temaEscuro
                                      ? "bg-neutral-800 text-neutral-300"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {ex.carga}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {exList.length > 3 && (
                          <p
                            className={`text-[10px] text-center font-bold pt-1 ${
                              temaEscuro ? "text-neutral-500" : "text-gray-400"
                            }`}
                          >
                            + {exList.length - 3} outros exercícios
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => setTreinoAtivo(treino)}
                      className="w-full py-3 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00AEFF]/20 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar / Ver Treino</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL CRIAR / EDITAR TREINO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-3xl border p-6 max-h-[90vh] overflow-y-auto ${
              temaEscuro
                ? "bg-neutral-900 border-neutral-800 text-white"
                : "bg-white border-gray-200 text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-black">
                {idEditando ? "Editar Treino" : "Novo Treino"}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-xl hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarTreino} className="space-y-4 pt-4">
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase mb-1 ${
                    temaEscuro ? "text-neutral-400" : "text-gray-500"
                  }`}
                >
                  Nome do Treino
                </label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Treino C - Pernas e Ombro"
                  className={`w-full p-3 rounded-xl border text-sm font-semibold outline-none ${
                    temaEscuro
                      ? "bg-neutral-950 border-neutral-800 text-white"
                      : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    className={`block text-[10px] font-bold uppercase ${
                      temaEscuro ? "text-neutral-400" : "text-gray-500"
                    }`}
                  >
                    Exercícios
                  </label>
                  <button
                    type="button"
                    onClick={adicionarExercicioForm}
                    className="text-[11px] font-bold text-[#00AEFF] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Exercício
                  </button>
                </div>

                {exerciciosForm.map((ex, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border space-y-2 ${
                      temaEscuro
                        ? "bg-neutral-950 border-neutral-800"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nome do exercício"
                        value={ex.nome}
                        onChange={(e) =>
                          handleExercicioChange(idx, "nome", e.target.value)
                        }
                        className={`w-full p-2 rounded-lg border text-xs font-semibold outline-none ${
                          temaEscuro
                            ? "bg-neutral-900 border-neutral-800 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      />
                      {exerciciosForm.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerExercicioForm(idx)}
                          className="p-2 text-red-500 hover:opacity-80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Séries"
                        value={ex.series}
                        onChange={(e) =>
                          handleExercicioChange(idx, "series", e.target.value)
                        }
                        className={`p-2 rounded-lg border text-xs outline-none ${
                          temaEscuro
                            ? "bg-neutral-900 border-neutral-800"
                            : "bg-white border-gray-300"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Reps (ex: 12)"
                        value={ex.repeticoes}
                        onChange={(e) =>
                          handleExercicioChange(
                            idx,
                            "repeticoes",
                            e.target.value
                          )
                        }
                        className={`p-2 rounded-lg border text-xs outline-none ${
                          temaEscuro
                            ? "bg-neutral-900 border-neutral-800"
                            : "bg-white border-gray-300"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Carga (ex: 20kg)"
                        value={ex.carga}
                        onChange={(e) =>
                          handleExercicioChange(idx, "carga", e.target.value)
                        }
                        className={`p-2 rounded-lg border text-xs outline-none ${
                          temaEscuro
                            ? "bg-neutral-900 border-neutral-800"
                            : "bg-white border-gray-300"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                    temaEscuro
                      ? "bg-neutral-800 text-neutral-300"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{idEditando ? "Atualizar Treino" : "Salvar Treino"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES / EXECUTAR TREINO */}
      {treinoAtivo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 max-h-[90vh] overflow-y-auto space-y-4 ${
              temaEscuro
                ? "bg-neutral-900 border-neutral-800 text-white"
                : "bg-white border-gray-200 text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-bold text-[#00AEFF] uppercase tracking-wider">
                  Modo de Execução
                </span>
                <h2 className="text-xl font-black">{treinoAtivo.titulo}</h2>
              </div>
              <button
                type="button"
                onClick={() => setTreinoAtivo(null)}
                className="p-2 rounded-xl hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {parseExercicios(treinoAtivo.exercicios).map((ex, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    temaEscuro
                      ? "bg-neutral-950 border-neutral-800"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{ex.nome}</p>
                    <p
                      className={`text-xs ${
                        temaEscuro ? "text-neutral-400" : "text-gray-500"
                      }`}
                    >
                      {ex.series} séries x {ex.repeticoes} reps
                      {ex.carga ? ` • Carga: ${ex.carga}` : ""}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-neutral-600 hover:text-emerald-400 cursor-pointer transition-colors" />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setTreinoAtivo(null)}
                className="w-full py-3 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl"
              >
                Concluir Treino
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-40 p-4">
        <div className={`max-w-lg mx-auto rounded-full border backdrop-blur-xl shadow-2xl p-2 px-6 flex justify-between items-center transition-colors duration-300 ${
          temaEscuro ? "bg-neutral-900/90 border-neutral-800/80 text-neutral-400" : "bg-white/90 border-gray-200/80 text-gray-500"
        }`}>
          <button type="button" onClick={() => navigate("/aluno/dashboard")} className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${temaEscuro ? "hover:text-white" : "hover:text-gray-900"}`}>
            <Home className="w-5 h-5" /><span className="text-[10px] font-bold">Início</span>
          </button>
          <button type="button" onClick={() => navigate("/aluno/treinos")} className="flex flex-col items-center gap-1 text-[#00AEFF] transition-all hover:scale-110">
            <Dumbbell className="w-5 h-5" /><span className="text-[10px] font-bold">Treinos</span>
          </button>
          <button type="button" onClick={() => navigate("/aluno/servicos")} className="flex flex-col items-center gap-1 -mt-5 bg-[#00AEFF] text-white p-3 rounded-full shadow-lg shadow-[#00AEFF]/30 transition-all hover:scale-110" title="Buscar Serviços">
            <Compass className="w-6 h-6" />
          </button>
          <button type="button" onClick={() => navigate("/aluno/dietas")} className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${temaEscuro ? "hover:text-white" : "hover:text-gray-900"}`}>
            <Utensils className="w-5 h-5" /><span className="text-[10px] font-bold">Dietas</span>
          </button>
          <button type="button" onClick={() => navigate("/aluno/perfil")} className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${temaEscuro ? "hover:text-white" : "hover:text-gray-900"}`}>
            <User className="w-5 h-5" /><span className="text-[10px] font-bold">Perfil</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
