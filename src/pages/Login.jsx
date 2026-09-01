import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowLeft,
  LogIn,
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

  const [dadosFormulario, setDadosFormulario] = useState({
    email: "",
    senha: "",
    perfil: "aluno",
  });

  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

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

    console.log("1. SUBMIT INICIADO | Dados:", dadosFormulario);

    if (!dadosFormulario.email || !dadosFormulario.senha) {
      setMensagemErro("Preencha todos os campos.");
      return;
    }

    setCarregando(true);
    setMensagemErro("");

    try {
      console.log("2. ENVIANDO REQUISIÇÃO PARA O BACKEND...");
      
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: dadosFormulario.email.trim().toLowerCase(),
          senha: dadosFormulario.senha,
          tipo_usuario: dadosFormulario.perfil.toLowerCase(),
        }),
      });

      console.log("3. RESPOSTA RECEBIDA | Status:", response.status);

      const data = await response.json();
      console.log("4. DADOS DA RESPOSTA:", data);

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

      localStorage.clear();
      localStorage.setItem("usuario", JSON.stringify(usuarioSalvar));
      
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      console.log("5. SESSÃO GRAVADA NO LOCALSTORAGE");
      setCarregando(false);

      const rotas = {
        aluno: "/aluno/dashboard",
        personal: "/personal/dashboard",
        nutri: "/nutri/dashboard",
        academia: "/academia/dashboard",
      };

      const rotaDestino = rotas[perfilFinal] || "/";
      console.log("6. REDIRECIONANDO PARA:", rotaDestino);

      setTimeout(() => {
        navigate(rotaDestino, { replace: true });
      }, 50);

    } catch (erro) {
      console.error("ERRO CRÍTICO NO LOGIN:", erro);
      setMensagemErro("Não foi possível conectar ao servidor (verifique o backend).");
      setCarregando(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-10 font-sans antialiased overflow-x-hidden">
      <div className="w-full max-w-lg sm:max-w-xl mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-[#00AEFF] text-base font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para o início</span>
        </Link>
      </div>

      <div className="w-full max-w-lg sm:max-w-xl bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={logoEscura}
            alt="Logo ConectaFit"
            className="h-16 sm:h-20 w-auto object-contain mb-4 select-none"
          />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Acesse o <span className="text-[#00AEFF]">ConectaFIT</span>
          </h1>
          <p className="text-neutral-400 text-base font-medium mt-2">
            Entre com suas credenciais para continuar
          </p>
        </div>

        {mensagemErro && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-base font-medium animate-fadeIn">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
            <span>{mensagemErro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#00AEFF] uppercase mb-3">
              Tipo de usuário:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {perfis.map((item) => {
                const IconeComponente = item.icone;
                const selecionado = dadosFormulario.perfil === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelecionarPerfil(item.id)}
                    className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center justify-between transition-all ${
                      selecionado
                        ? "border-[#00AEFF] bg-[#00AEFF]/15 text-white shadow-lg shadow-[#00AEFF]/10"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
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
            <label className="block text-xs sm:text-sm font-bold text-neutral-300 uppercase mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                value={dadosFormulario.email}
                onChange={handleChange}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-neutral-300 uppercase">
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
                type={verSenha ? "text" : "password"}
                name="senha"
                value={dadosFormulario.senha}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl py-3.5 pl-12 pr-12 text-white text-base font-medium focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setVerSenha(!verSenha)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
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
            onClick={handleSubmit}
            disabled={carregando}
            className="w-full py-4 bg-[#00AEFF] hover:bg-[#1ebbf0] text-white font-extrabold text-base sm:text-lg rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 mt-8 disabled:opacity-50 cursor-pointer"
          >
            <LogIn className="w-6 h-6" />
            <span>{carregando ? "Entrando..." : "Entrar"}</span>
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-neutral-400">
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
