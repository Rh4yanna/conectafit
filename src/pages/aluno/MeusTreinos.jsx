import AbasAluno from '../../components/aluno/AbasAluno';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import ModalAlimentacao from '../../components/alimentacao/ModalAlimentacao';
import SessoesTreino from './SessoesTreino';
import BibliotecaExercicios from '../../components/BibliotecaExercicios';
import DemonstracaoExercicio from '../../components/DemonstracaoExercicio';
import { useTheme } from '../../context/ThemeContext';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dumbbell, Plus, Trash2, Edit3, Play, Loader2 } from "lucide-react";

import { apiFetch } from '../../config/api';

export default function MeusTreinos() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [biblioteca, setBiblioteca] = useState(false);
  const [alvoBiblioteca, setAlvoBiblioteca] = useState(null);
  const [diasSemana, setDiasSemana] = useState([]);
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // TEMA
  const {temaEscuro} = useTheme();

  // ESTADOS PRINCIPAIS
  const [modalAberto, setModalAberto] = useState(false);
  const [aba,setAba]=useState('sessao');
  const [treinoAtivo, setTreinoAtivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carregandoTreinos, setCarregandoTreinos] = useState(true);
  const [erroTreinos, setErroTreinos] = useState('');
  const [erroFormulario,setErroFormulario]=useState('');

  // ESTADOS DE DADOS
  const [treinos, setTreinos] = useState([]);
  useEffect(() => {
    const id = parametros.get('ficha');
    if (!id || carregandoTreinos) return;
    const ficha = treinos.find(t => String(t.id) === id);
    if (ficha) setTreinoAtivo(ficha);
    setParametros({}, { replace: true });
  }, [parametros, treinos, carregandoTreinos, setParametros]);

  // Requisições autenticadas das fichas.
  const getFetchConfig = (method = "GET", body = null) => {
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return config;
  };

  useEffect(() => {
    if (!localStorage.getItem("usuario")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Carregar fichas do aluno.
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregandoTreinos(true);
      try {
        const resTreinos = await apiFetch('/treinos', getFetchConfig("GET")).catch(() => null);
        if (resTreinos?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/login", { replace: true });
          return;
        }
        if (!resTreinos || !resTreinos.ok) throw new Error('Não foi possível carregar seus treinos. Tente novamente mais tarde.');
        if (resTreinos && resTreinos.ok) {
          const dataTreinos = await resTreinos.json();
          setTreinos(Array.isArray(dataTreinos) ? dataTreinos : []);
        }
      } catch (error) {
        setErroTreinos(error.message);
      } finally {
        setCarregandoTreinos(false);
      }
    };

    carregarDadosIniciais();
  }, [navigate]);

  // FECHAR MODAIS COM ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
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
  const [exerciciosForm, setExerciciosForm] = useState([]);


  // AÇÕES DO FORMULÁRIO


  const removerExercicioForm = (index) => {
    if (exerciciosForm.length > 0) {
      setExerciciosForm(exerciciosForm.filter((_, i) => i !== index));
    }
  };

  const handleExercicioChange = (index, campo, valor) => {
    const novos = exerciciosForm.map((item, i) => {
      if (i === index) {
        return { ...item, [campo]: valor, ...(campo === 'nome' ? { catalogo_id: null } : {}) };
      }
      return item;
    });
    setExerciciosForm(novos);
  };

  const abrirModalNovoTreino = () => {
    setDiasSemana([]);
    setIdEditando(null);
    setNovoTitulo("");
    setExerciciosForm([]);
    setModalAberto(true);
  };

  const abrirModalEditarTreino = (treino) => {
    setDiasSemana(treino.dias_semana || []);
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

  // Salvar ficha.
  const salvarTreino = async (e) => {
    e.preventDefault();
    if (loading || !novoTitulo.trim()) return;
    setErroFormulario('');

    const exerciciosFiltrados = exerciciosForm.filter(
      (ex) => ex.nome.trim() !== ""
    );

    if (exerciciosFiltrados.length === 0) {
      setErroFormulario("Adicione pelo menos um exercício com nome válido.");
      return;
    }

    setLoading(true);

    const payload = {
      titulo: novoTitulo.trim(),
      exercicios: exerciciosFiltrados,
      dias_semana: diasSemana,
    };

    try {
      if (idEditando) {
        const response = await apiFetch(
          `/treinos/${idEditando}`,
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
          setErroFormulario(errData.message || "Não foi possível atualizar o treino.");
        }
      } else {
        const response = await apiFetch(
          '/treinos',
          getFetchConfig("POST", payload)
        );

        if (response.ok) {
          const { treino: treinoCriado } = await response.json();
          setTreinos((anteriores) => [treinoCriado, ...anteriores]);
          setModalAberto(false);
        } else {
          const errData = await response.json().catch(() => ({}));
          setErroFormulario(errData.message || "Não foi possível salvar o treino.");
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      setErroFormulario(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. DELETAR TREINO
  const deletarTreino = async (id) => {
    if (!window.confirm("Deseja realmente excluir este treino?")) return;

    try {
      const response = await apiFetch(
        `/treinos/${id}`,
        getFetchConfig("DELETE")
      );

      if (response.ok) {
        setTreinos((anteriores) => anteriores.filter((t) => t.id !== id));
      } else {
        const errData = await response.json().catch(() => ({}));
        setErroTreinos(errData.message || "Não foi possível remover o treino.");
      }
    } catch (error) {
      console.error("Erro ao deletar treino:", error);
      setErroTreinos(error.message);
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

  const grupos = [
    {id:'pessoais', titulo:'Meus treinos', fichas:treinos.filter(t=>t.origem!=='personal')},
    {id:'personal', titulo:'Treinos do personal', fichas:treinos.filter(t=>t.origem==='personal')},
  ].filter(g=>g.fichas.length);
  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 ${
        temaEscuro ? "bg-black text-white" : "bg-gray-100 text-gray-900"
      }`}
    >


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
              Organize seus treinos pessoais e consulte as fichas do personal.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalNovoTreino}
            className="px-4 py-3 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00AEFF]/20 flex items-center gap-2 shrink-0 justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar treino</span>
          </button>
        </div>


        <AbasAluno valor={aba} onChange={setAba} itens={[['sessao','Meus treinos'],['historico','Histórico'],['retornos','Feedbacks']]}/><div hidden={aba!=='sessao'}>
        {carregandoTreinos ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#00AEFF] animate-spin" />
            <p className="text-xs text-neutral-400">Carregando treinos...</p>
          </div>
        ) : erroTreinos ? <MensagemTemporaria as="p" role="alert" className="p-6 rounded-2xl border border-red-500/30 text-red-400">{erroTreinos}</MensagemTemporaria> : treinos.length === 0 ? (
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
              Sua ficha ainda não foi cadastrada. Crie um treino ou conecte-se a um personal para receber orientação.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-3">
              <button onClick={abrirModalNovoTreino} className="bg-[#00AEFF] text-white font-bold px-4 py-3 rounded-xl">Criar meu primeiro treino</button>
              <button onClick={()=>navigate('/aluno/conexoes')} className="border border-neutral-500 px-4 py-3 rounded-xl">Ver minhas conexões</button>
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${grupos.length > 1 ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
            {grupos.map(grupo=><section key={grupo.id} aria-label={grupo.titulo} className="min-w-0 space-y-4">
              {grupos.length > 1 && <h2 className="text-xl font-bold">{grupo.titulo}</h2>}
              <div className={`grid gap-4 items-start ${grupos.length === 1 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {[1,2,3,4,5,6,0,null].map(dia=>{
                const fichas=grupo.fichas.filter(t=>dia===null?!t.dias_semana?.length:t.dias_semana?.includes(dia));
                if(dia===null&&!fichas.length)return null;
                return <section key={dia??'livre'} className="min-w-0 space-y-3" aria-label={dia===null?'Sem dia definido':dias[dia]}>
                  <h3 className="font-semibold border-b border-neutral-500/20 pb-2">{dia===null?'Sem dia definido':dias[dia]}</h3>
                  {!fichas.length&&<p className="text-sm text-neutral-400">Sem treino programado</p>}
            {fichas.map((treino) => {
              const exList = parseExercicios(treino.exercicios);

              return (
                <div
                  key={treino.id}
                  data-card-treino={treino.id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                    temaEscuro
                      ? "bg-neutral-900 border-neutral-800"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                            treino.origem === "personal"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-[#00AEFF]/10 text-[#00AEFF] border border-[#00AEFF]/20"
                          }`}
                        >
                          <Dumbbell className="w-3 h-3" />
                          <span className="break-words">{treino.origem === 'personal' ? treino.criado_por || 'Personal' : 'Treino pessoal'}</span>
                        </span>
                        <h2 className="text-base font-bold tracking-tight break-words">
                          {treino.titulo}
                        </h2>
                        <p className="text-sm mt-1">{treino.dias_semana?.length ? treino.dias_semana.map(n => dias[n]).join(' · ') : 'Sem dias definidos'}</p>{(treino.inicio_em||treino.fim_em)&&<p className="text-sm">Programação: {treino.inicio_em?.slice(0,10)||'sem início'} até {treino.fim_em?.slice(0,10)||'sem fim'}</p>}
                      </div>

                      {treino.origem === 'aluno' && <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={treino.origem === 'personal'}
                          title={treino.origem === 'personal' ? 'Prescrição revisada pelo personal responsável' : 'Editar treino pessoal'}
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
                          disabled={treino.origem === 'personal'}
                          title={treino.origem === 'personal' ? 'O personal pode arquivar esta ficha' : 'Excluir treino pessoal'}
                          onClick={() => deletarTreino(treino.id)}
                          className="p-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>}
                    </div>

                    <p className={`text-sm ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>{exList.length} exercícios</p>
                    <p className={`text-xs line-clamp-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`} title={exList.map(ex=>ex.nome).join(' · ')}>{exList.map(ex=>ex.nome).join(' · ')}</p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setTreinoAtivo(treino)}
                      className="w-full py-2.5 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00AEFF]/20 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar / Ver Treino</span>
                    </button>
                  </div>
                </div>
              );
            })}
                </section>;
              })}
              </div>
            </section>)}
          </div>
        )}
        </div><SessoesTreino aba={aba} ficha={treinoAtivo} limparFicha={() => setTreinoAtivo(null)} />
      </main>

      {/* MODAL CRIAR / EDITAR TREINO */}
      {modalAberto && (
        <ModalAlimentacao titulo={idEditando?'Editar Treino':'Novo Treino'} ocupado={loading} onClose={()=>setModalAberto(false)}>
            <form onSubmit={salvarTreino} className="space-y-4 pt-4">{erroFormulario&&<MensagemTemporaria as="p" role="alert" className="text-red-500">{erroFormulario}</MensagemTemporaria>}
              <fieldset className="border border-neutral-500/30 rounded-xl p-4 space-y-3"><legend className="font-bold">Dias da semana</legend><p className="text-sm">Em quais dias você fará esta ficha? Ela aparecerá no painel nesses dias, toda semana, no horário de Brasília.</p><div className="flex flex-wrap gap-2">{[1,2,3,4,5,6,0].map(n => <label key={n} className={`flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer ${diasSemana.includes(n) ? 'border-sky-500 bg-sky-500/10' : 'border-neutral-500/30'}`}><input type="checkbox" checked={diasSemana.includes(n)} onChange={e => setDiasSemana(v => e.target.checked ? [...v,n].sort() : v.filter(d => d !== n))}/> {dias[n]}</label>)}</div><p className="text-sm" role="status">{diasSemana.length ? `Programado para: ${[1,2,3,4,5,6,0].filter(n => diasSemana.includes(n)).map(n => dias[n]).join(', ')}.` : 'Sem programação: disponível em Meus Treinos, mas não aparece como treino do dia.'}</p>{treinos.some(t => String(t.id) !== String(idEditando) && t.dias_semana?.some(n => diasSemana.includes(n))) && <p className="text-sm">Você já tem outra ficha em um dos dias selecionados. As duas aparecerão no painel para você escolher.</p>}</fieldset>
              <div className="rounded-xl border border-sky-500/40 p-4 space-y-2"><h3 className="font-bold">Escolha seus exercícios</h3><p className="text-sm">Busque na biblioteca e selecione a variação e o equipamento. Depois, ajuste séries, repetições e carga.</p><button type="button" disabled={exerciciosForm.length >= 50} className="w-full bg-sky-600 text-white rounded-xl p-3 font-bold disabled:opacity-50" onClick={() => { setAlvoBiblioteca(null); setBiblioteca(true); }}>Adicionar da biblioteca de exercícios</button></div>
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
                  maxLength={120}
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

                </div>

                {!exerciciosForm.length && <p className="text-sm border border-dashed border-neutral-500/40 rounded-xl p-4">Nenhum exercício selecionado. Escolha exercícios com vídeo na biblioteca.</p>}
                {exerciciosForm.map((ex, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border space-y-2 ${
                      temaEscuro
                        ? "bg-neutral-950 border-neutral-800"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3"><button type="button" className="acao-secundaria text-sky-500 text-sm" onClick={() => { setAlvoBiblioteca(idx); setBiblioteca(true); }}>Vincular exercício da biblioteca</button>{ex.catalogo_id && <span className="text-xs">Vinculado à biblioteca</span>}</div>
                    {ex.catalogo_id && <DemonstracaoExercicio key={ex.catalogo_id} catalogoId={ex.catalogo_id}/>}
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nome do exercício"
                        maxLength={120}
                        aria-label={`Nome do exercício ${idx + 1}`}
                        readOnly={Boolean(ex.catalogo_id)}
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
                      {exerciciosForm.length > 0 && (
                        <button
                          type="button"
                          onClick={() => removerExercicioForm(idx)}
                          aria-label={`Remover exercício ${idx + 1}`}
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
                        aria-label={`Quantidade de séries do exercício ${idx + 1}`}
                        required
                        min="1"
                        max="30"
                        step="1"
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
                    <label className="block text-xs">Orientações para este exercício<textarea className={`block w-full border border-neutral-500 rounded-lg p-2 ${temaEscuro ? 'bg-neutral-900' : 'bg-white'}`} rows={2} maxLength={1000} value={ex.orientacoes || ''} onChange={e => handleExercicioChange(idx, 'orientacoes', e.target.value)}/></label>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={loading} onClick={() => setModalAberto(false)}
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
        </ModalAlimentacao>
      )}




      {biblioteca && <BibliotecaExercicios onFechar={() => setBiblioteca(false)} onSelecionar={item => {
        setExerciciosForm(lista => {
          const novo = { nome: item.nome, catalogo_id: item.id, series: '3', repeticoes: '12', carga: '', orientacoes: '' };
          if (alvoBiblioteca !== null) return lista.map((ex, i) => i === alvoBiblioteca ? { ...ex, nome: item.nome, catalogo_id: item.id } : ex);
          const vazio = lista.findIndex(ex => !ex.nome.trim());
          return vazio >= 0 ? lista.map((ex, i) => i === vazio ? novo : ex) : [...lista, novo];
        });
        setBiblioteca(false);
      }}/>}
    </div>
  );
}
