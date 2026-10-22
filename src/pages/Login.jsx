import MensagemTemporaria from '../components/MensagemTemporaria';
import { useEffect, useRef, useState } from "react";
import { useAbertura } from '../components/AberturaAplicacao';
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowLeft,
  CircleUserRound,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  Dumbbell,
  Apple,
  Building2,
  CheckCircle2,
} from "lucide-react";
import logoEscura from "../assets/fescuro.png";
import { API_URL } from '../config/api';

export default function Login() {
  const navigate = useNavigate();
  const { iniciar } = useAbertura();
  const enviando = useRef(false);

  const [dadosFormulario, setDadosFormulario] = useState({
    email: "",
    senha: "",
    perfil: "aluno",
  });

  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [alertaSeguranca, setAlertaSeguranca] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (alertaSeguranca?.tipo !== "brute-force" || segundosRestantes <= 0) {
      return undefined;
    }

    const temporizador = window.setTimeout(() => {
      setSegundosRestantes((segundos) => segundos - 1);
    }, 1000);

    return () => window.clearTimeout(temporizador);
  }, [alertaSeguranca, segundosRestantes]);

  const mostrarAlertaSeguranca = (data) => {
    const tipo = data.securityEvent;
    const configuracoes = {
      sqli: { icone: "🛡️", titulo: "SQL Injection bloqueada" },
      xss: { icone: "🧯", titulo: "Script neutralizado" },
      "brute-force": { icone: "☕", titulo: "Calma aí..." },
    };

    setAlertaSeguranca({
      tipo,
      mensagem: data.message,
      ...(configuracoes[tipo] || {
        icone: "🍯",
        titulo: "Honeypot ativado",
      }),
    });
    setSegundosRestantes(Number(data.retryAfter) || 0);
  };

  const perfis = [
    { id: "aluno", label: "Aluno", icone: GraduationCap },
    { id: "personal", label: "Personal", icone: Dumbbell },
    { id: "nutri", label: "Nutricionista", icone: Apple },
    { id: "academia", label: "Academia", icone: Building2 },
  ];

  const handleChange = (e) => {
    setDadosFormulario((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (mensagemErro) setMensagemErro("");
  };

  const handleSelecionarPerfil = (idPerfil) => {
    setDadosFormulario((prev) => ({
      ...prev,
      perfil: idPerfil,
    }));
    if (mensagemErro) setMensagemErro("");
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!dadosFormulario.email || !dadosFormulario.senha) {
      setMensagemErro("Preencha todos os campos.");
      return;
    }

    if (enviando.current) return;
    enviando.current = true;
    setCarregando(true);
    setMensagemErro("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-ConectaFit-Request": "1" },
        body: JSON.stringify({
          email: dadosFormulario.email.trim().toLowerCase(),
          senha: dadosFormulario.senha,
          tipo_usuario: dadosFormulario.perfil.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (data.securityEvent) {
        mostrarAlertaSeguranca(data);
        setCarregando(false);
        return;
      }

      if (!response.ok) {
        setMensagemErro(data.message || "E-mail ou senha incorretos.");
        setCarregando(false);
        return;
      }

      let perfilFinal = (
        data.usuario?.tipo_usuario || 
        data.tipo_usuario || 
        dadosFormulario.perfil
      ).toLowerCase();

      if (perfilFinal === "nutricionista") {
        perfilFinal = "nutri";
      }

      const usuarioSalvar = {
        ...(data.usuario || data),
        tipo_usuario: perfilFinal,
        perfil: perfilFinal,
      };

      localStorage.removeItem("token");
      localStorage.removeItem("usuarioLogado");
      localStorage.setItem("usuario", JSON.stringify(usuarioSalvar));
      


      setCarregando(false);

      const rotas = {
        aluno: "/aluno/dashboard",
        personal: "/personal/dashboard",
        nutri: "/nutri/dashboard",
        academia: "/academia/dashboard",
      };

      const convite=sessionStorage.getItem('convitePersonal');
      const conviteAcademia=sessionStorage.getItem('conviteAcademia');
      const rotaDestino = perfilFinal==='aluno'&&/^[a-f0-9]{64}$/.test(conviteAcademia||'')?`/convite/academia/${conviteAcademia}`:perfilFinal==='aluno'&&/^[a-f0-9]{64}$/.test(convite||'')?`/convite/${convite}`:rotas[perfilFinal] || "/";
      iniciar(rotaDestino);
      navigate(rotaDestino, { replace: true });

    } catch (erro) {
      console.error("ERRO CRÍTICO NO LOGIN:", erro);
      setMensagemErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    } finally {
      enviando.current = false;
    }
  };

  return (
    <div className="fit-auth pagina-login relative min-h-screen bg-[#172331] text-white flex flex-col justify-center items-center px-4 py-3 font-sans antialiased overflow-x-hidden">
      {alertaSeguranca && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-alerta-seguranca"
        >
          <div className="w-full max-w-lg rounded-3xl border-2 border-amber-400/60 bg-neutral-950 p-8 text-center shadow-2xl shadow-amber-500/20">
            <div className="mb-4 text-7xl" aria-hidden="true">
              {alertaSeguranca.icone}
            </div>
            <h2
              id="titulo-alerta-seguranca"
              className="text-3xl font-black text-amber-300"
            >
              {alertaSeguranca.titulo}
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-neutral-200">
              {alertaSeguranca.mensagem}
            </p>
            {alertaSeguranca.tipo === "brute-force" &&
              segundosRestantes > 0 && (
                <p className="mt-5 text-2xl font-black text-[#00AEFF]">
                  Tente novamente em {segundosRestantes}s
                </p>
              )}
            <button
              type="button"
              onClick={() => setAlertaSeguranca(null)}
              className="mt-7 rounded-xl bg-amber-400 px-7 py-3 font-extrabold text-black transition hover:bg-amber-300"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
      <div className="w-full max-w-md mb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-9 text-neutral-400 hover:text-[#00AEFF] text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para o início</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#000000] border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-4">
          <img
            src={logoEscura}
            alt="Logo ConectaFit"
            className="h-12 sm:h-14 w-auto object-contain mb-2 select-none"
          />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Acesse o <span className="text-[#00AEFF]">ConectaFIT</span>
          </h1>
          <p className="text-neutral-400 text-sm font-medium mt-2">
            Cada passo conta na sua evolução.
          </p>
        </div>

        {mensagemErro && (
          <MensagemTemporaria as="div" role="alert" className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-base font-medium animate-fadeIn">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
            <span>{mensagemErro}</span>
          </MensagemTemporaria>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#00AEFF] uppercase mb-2">
              Tipo de usuário:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {perfis.map((item) => {
                const IconeComponente = item.icone;
                const selecionado = dadosFormulario.perfil === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelecionarPerfil(item.id)}
                    className={`min-h-11 py-2 px-2.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all ${
                      selecionado
                        ? "border-[#00AEFF] bg-[#00AEFF]/15 text-white shadow-lg shadow-[#00AEFF]/10"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconeComponente
                        className={`w-5 h-5 ${
                          selecionado ? "text-[#00AEFF]" : "text-neutral-500"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {selecionado && (
                      <CheckCircle2 className="w-5 h-5 text-[#00AEFF]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="login-email" className="block text-xs sm:text-sm font-bold text-neutral-300 uppercase mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                autoComplete="username"
                type="email"
                name="email"
                value={dadosFormulario.email}
                onChange={handleChange}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-2.5 pl-12 pr-4 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-senha" className="text-xs sm:text-sm font-bold text-neutral-300 uppercase">
                Senha
              </label>
              <Link
                to="/esqueci-senha"
                className="text-xs sm:text-sm text-neutral-400 hover:text-[#00AEFF] font-medium transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="login-senha"
                autoComplete="current-password"
                type={verSenha ? "text" : "password"}
                name="senha"
                value={dadosFormulario.senha}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-2.5 pl-12 pr-12 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setVerSenha(!verSenha)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={verSenha}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
              >
                {verSenha ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full min-h-11 py-2.5 bg-[#00AEFF] hover:bg-[#1ebbf0] text-white font-extrabold text-base sm:text-lg rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CircleUserRound className="w-6 h-6" />
            <span>{carregando ? "Entrando..." : "Entrar"}</span>
          </button>
        </form>

        <div className="mt-3 text-center text-sm font-medium text-neutral-400">
          Ainda não tem uma conta?{" "}
          <Link
            to="/cadastro"
            className="text-[#00AEFF] font-bold hover:underline"
          >
            Cadastre-se gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
}
