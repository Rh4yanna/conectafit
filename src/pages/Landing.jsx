import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, LogIn, Dumbbell, ShieldCheck, Zap, Apple, Search } from 'lucide-react';
import logoEscura from '../assets/fescuro.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans antialiased overflow-x-hidden">
      
      {/* BARRA DE NAVEGAÇÃO RESPONSIVA */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <img 
            src={logoEscura} 
            alt="Logo ConectaFit" 
            className="h-10 sm:h-14 w-auto object-contain flex-shrink-0 select-none" 
          />
          <span className="text-xl sm:text-3xl font-black tracking-tight truncate">
            Conecta<span className="text-[#00AEFF]">FIT</span>
          </span>
        </div>

        <Link
          to="/login"
          className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-6 sm:py-3.5 bg-[#00AEFF] hover:bg-[#1ebbf0] text-white font-extrabold text-xs sm:text-base rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Fazer Login</span>
        </Link>
      </header>

      {/* SEÇÃO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-7xl mx-auto py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-full text-xs sm:text-sm text-[#00AEFF] font-bold mb-6 sm:mb-8">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Sua plataforma fitness completa</span>
        </div>

        <h1 className="text-3xl sm:text-6xl font-black tracking-tight leading-tight mb-6 sm:mb-8 max-w-5xl">
          Conecte seu treino ao seu <span className="text-[#00AEFF]">resultado</span>.
        </h1>

        <p className="text-neutral-200 text-base sm:text-xl font-medium max-w-3xl mb-8 sm:mb-12 leading-relaxed">
          O ConectaFit une alunos, personal trainers, nutricionistas e academias em um só lugar. Acompanhe fichas de treino, planos alimentares e sua evolução física em tempo real.
        </p>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 sm:py-5 bg-[#00AEFF] hover:bg-[#1ebbf0] text-white font-black text-base sm:text-lg rounded-2xl transition-all shadow-lg shadow-[#00AEFF]/30 flex items-center justify-center gap-3 uppercase tracking-wider active:scale-95"
          >
            Acesse a versão web
          </Link>

          <button
            onClick={() => alert('Aplicativo móvel em breve na Play Store e App Store!')}
            className="w-full sm:w-auto px-8 py-4 sm:py-5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-base sm:text-lg rounded-2xl border-2 border-neutral-700 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-[#00AEFF]" />
            <span>Baixar o Aplicativo</span>
          </button>
        </div>

        {/* RECURSOS EM DESTAQUE (5 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mt-12 sm:mt-16 text-left w-full">
          <div className="p-5 sm:p-6 bg-neutral-900 border-2 border-neutral-800 rounded-2xl flex flex-col justify-between">
            <div>
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEFF] mb-3 sm:mb-4" />
              <h3 className="font-extrabold text-lg sm:text-xl mb-2 text-white">Encontre Parceiros</h3>
              <p className="text-xs sm:text-sm font-medium text-neutral-300 leading-relaxed">
                Localize e conecte-se aos melhores personais, nutricionistas e academias perto de você.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-neutral-900 border-2 border-neutral-800 rounded-2xl flex flex-col justify-between">
            <div>
              <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEFF] mb-3 sm:mb-4" />
              <h3 className="font-extrabold text-lg sm:text-xl mb-2 text-white">Treinos Personalizados</h3>
              <p className="text-xs sm:text-sm font-medium text-neutral-300 leading-relaxed">
                Fichas personalizadas pelo seu treinador com orientações completas.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-neutral-900 border-2 border-neutral-800 rounded-2xl flex flex-col justify-between">
            <div>
              <Apple className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEFF] mb-3 sm:mb-4" />
              <h3 className="font-extrabold text-xl mb-2 text-white">Nutrição Integrada</h3>
              <p className="text-xs sm:text-sm font-medium text-neutral-300 leading-relaxed">
                Acompanhamento de dietas e metas alimentares ajustadas pelo seu nutricionista.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-neutral-900 border-2 border-neutral-800 rounded-2xl flex flex-col justify-between">
            <div>
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEFF] mb-3 sm:mb-4" />
              <h3 className="font-extrabold text-lg sm:text-xl mb-2 text-white">Evolução em Tempo Real</h3>
              <p className="text-xs sm:text-sm font-medium text-neutral-300 leading-relaxed">
                Acompanhe cargas, frequência de treino e seu progresso físico diário.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-neutral-900 border-2 border-neutral-800 rounded-2xl flex flex-col justify-between">
            <div>
              <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEFF] mb-3 sm:mb-4" />
              <h3 className="font-extrabold text-xl mb-2 text-white">Gestão Segura</h3>
              <p className="text-xs sm:text-sm font-medium text-neutral-300 leading-relaxed">
                Seus dados e históricos protegidos na nuvem com total segurança.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="w-full text-center py-6 text-xs sm:text-sm font-semibold text-neutral-400 border-t border-neutral-900">
          ConectaFit desenvolvido por Rhayanna Borges Tonete.
      </footer>
    </div>
  );
}
