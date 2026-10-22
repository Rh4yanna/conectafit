import MensagemTemporaria from '../components/MensagemTemporaria';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  Dumbbell,
  Apple,
  Building2,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import logoEscura from "../assets/fescuro.png";
import { apiFetch } from '../config/api';

export default function Cadastro() {
  const navigate = useNavigate();

  const [dadosFormulario, setDadosFormulario] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "aluno",
  });

  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [website, setWebsite] = useState(() =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).has("testar-honeypot")
      ? "teste-local"
      : ""
  );

  const perfis = [
    { id: "aluno", label: "Aluno", icone: GraduationCap },
    { id: "personal", label: "Personal", icone: Dumbbell },
    { id: "nutri", label: "Nutricionista", icone: Apple },
    { id: "academia", label: "Academia", icone: Building2 },
  ];

  const handleChange = (e) => {
    setDadosFormulario({ ...dadosFormulario, [e.target.name]: e.target.value });
    if (mensagemErro) setMensagemErro("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new TextEncoder().encode(dadosFormulario.senha).length > 72) {
      setMensagemErro('A senha está muito longa. Use até 72 caracteres simples; acentos e emojis ocupam mais espaço.');
      return;
    }
    setCarregando(true);
    setMensagemErro("");

    // Normaliza o perfil caso o backend espere "nutricionista" em vez de "nutri"
    let tipoUsuarioFinal = dadosFormulario.perfil.toLowerCase();
    if (tipoUsuarioFinal === "nutri") {
      tipoUsuarioFinal = "nutricionista";
    }

    try {
      const response = await apiFetch('/cadastro', {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-ConectaFit-Request": "1" },
        body: JSON.stringify({
          nome: dadosFormulario.nome.trim(),
          email: dadosFormulario.email.trim().toLowerCase(),
          senha: dadosFormulario.senha,
          tipo_usuario: tipoUsuarioFinal,
          website,
        }),
      });

      const data = await response.json();

      if (data.honeypot) {
        setCarregando(false);
        setMensagemSucesso(data.message);
        setWebsite("");
        setTimeout(() => setMensagemSucesso(""), 5000);
        return;
      }

      if (!response.ok) {
        setMensagemErro(data.message || "Erro ao realizar cadastro.");
        setCarregando(false);
        return;
      }

      setCarregando(false);
      setMensagemSucesso("Conta criada com sucesso! Redirecionando...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (erro) {
      console.error("Erro ao cadastrar:", erro);
      setMensagemErro(
        "Não foi possível conectar ao servidor. Verifique sua conexão."
      );
      setCarregando(false);
    }
  };

  return (
    <div className="fit-auth relative min-h-screen bg-[#172331] text-white flex flex-col justify-center items-center px-4 py-3 font-sans antialiased overflow-x-hidden">
      
      {/* OVERLAY DE SUCESSO */}
      {mensagemSucesso && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-base sm:text-lg flex items-center gap-3 border border-emerald-400/40">
            <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
            <MensagemTemporaria as="span">{mensagemSucesso}</MensagemTemporaria>
          </div>
        </div>
      )}

      {/* CONTAINER RESPONSIVO */}
      <div className="w-full max-w-md mb-2">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 min-h-9 text-neutral-400 hover:text-[#00AEFF] text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para o Login</span>
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
            Crie sua conta no <span className="text-[#00AEFF]">ConectaFIT</span>
          </h1>
          <p className="text-neutral-400 text-sm font-medium mt-2">
            Junte-se à nossa comunidade fitness
          </p>
        </div>

        {/* MENSAGEM DE ERRO */}
        {mensagemErro && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-base font-medium animate-fadeIn">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
            <MensagemTemporaria as="span">{mensagemErro}</MensagemTemporaria>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
            <label htmlFor="cadastro-website">Olha só alguém curioso passeando onde não devia</label>
            <input id="cadastro-website" name="website" type="text" tabIndex="-1" autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          {/* SELEÇÃO DE PERFIL */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#00AEFF] uppercase mb-2">
              Selecione o seu tipo de perfil:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {perfis.map((item) => {
                const IconeComponente = item.icone;
                const selecionado = dadosFormulario.perfil === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDadosFormulario({
                        ...dadosFormulario,
                        perfil: item.id,
                      });
                      if (mensagemErro) setMensagemErro("");
                    }}
                    className={`min-h-11 py-2 px-2.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all ${
                      selecionado
                        ? "border-[#00AEFF] bg-[#00AEFF]/15 text-white shadow-lg shadow-[#00AEFF]/10"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconeComponente
                        className={`w-5 h-5 ${selecionado ? "text-[#00AEFF]" : "text-neutral-500"}`}
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

          {/* NOME COMPLETO */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-300 uppercase mb-2">
              Nome Completo
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="nome"
                required
                value={dadosFormulario.nome}
                onChange={handleChange}
                placeholder="Seu nome completo"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-2.5 pl-12 pr-4 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>

          {/* E-MAIL */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-300 uppercase mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                value={dadosFormulario.email}
                onChange={handleChange}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-2.5 pl-12 pr-4 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>

          {/* SENHA */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-neutral-300 uppercase mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={verSenha ? "text" : "password"}
                name="senha"
                required
                minLength={8}
                value={dadosFormulario.senha}
                onChange={handleChange}
                placeholder="Mínimo de 8 caracteres"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-2.5 pl-12 pr-12 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setVerSenha(!verSenha)}
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

          {/* BOTÃO ENVIAR */}
          <button
            type="submit"
            disabled={carregando || Boolean(mensagemSucesso)}
            className="w-full min-h-11 py-2.5 bg-[#00AEFF] hover:bg-[#1ebbf0] text-white font-extrabold text-base sm:text-lg rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 disabled:opacity-50"
          >
            <UserCheck className="w-6 h-6" />
            <span>{carregando ? "Salvando..." : "Criar minha conta"}</span>
          </button>
        </form>

        <div className="mt-3 text-center text-sm font-medium text-neutral-400">
          Já possui uma conta?{" "}
          <Link
            to="/login"
            className="text-[#00AEFF] font-bold hover:underline"
          >
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  );
}
