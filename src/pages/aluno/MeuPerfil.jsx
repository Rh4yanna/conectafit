import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Home, 
  Compass, 
  Dumbbell, 
  Utensils, 
  Sun, 
  Moon, 
  LogOut, 
  UserCheck,
  CheckCircle2,
  Camera,
  Upload,
  Loader2,
  MoreVertical,
  Link,
  ChevronRight,
  X, Trash2, Target, Ruler
} from 'lucide-react';
import { apiFetch } from '../../config/api';

export default function MeuPerfil() {
  const navigate = useNavigate();

  // DADOS DO USUÁRIO NO LOCALSTORAGE
  const [usuarioSalvo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || {
        nome: 'Rhayanna Borges Tonete',
        email: 'engs-rhayannatonete@camporeal...',
        telefone: '',
        cidade: '',
        endereco: '',
        tipo_usuario: 'aluno',
        foto_url: ''
      };
    } catch {
      return { nome: 'Aluno', email: '', telefone: '', cidade: '', endereco: '', tipo_usuario: 'aluno', foto_url: '' };
    }
  });

  // PERSISTÊNCIA DO TEMA
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('temaEscuro');
    return temaSalvo !== null ? JSON.parse(temaSalvo) : true;
  });

  // ESTADOS GERAIS
  const [menuAberto, setMenuAberto] = useState(false);
  const fileInputRef = useRef(null);
  const [sucessoMsg, setSucessoMsg] = useState(false);
  const [loading, setLoading] = useState(false);

  // FORMULÁRIO DE PERFIL
  const [formData, setFormData] = useState({
    id: usuarioSalvo.id || '',
    nome: usuarioSalvo.nome || '',
    email: usuarioSalvo.email || '',
    telefone: usuarioSalvo.telefone || usuarioSalvo.whatsapp || '',
    cidade: usuarioSalvo.cidade || '',
    endereco: usuarioSalvo.endereco || '',
    tipo_usuario: usuarioSalvo.tipo_usuario || 'aluno',
    foto_url: usuarioSalvo.foto_url || ''
  });

  // SALVAR PREFERÊNCIA DE TEMA
  useEffect(() => {
    localStorage.setItem('temaEscuro', JSON.stringify(temaEscuro));
  }, [temaEscuro]);

  // FECHAR MENU DROPDOWN AO PRESSIONAR ESC
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuAberto(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTema = () => setTemaEscuro((prev) => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // UPLOAD DE IMAGEM LOCAL
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, foto_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // SALVAR ALTERAÇÕES
  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);
    const response = await apiFetch('/aluno/perfil',{method:'PUT',body:JSON.stringify(formData)});
    if(response.ok){const usuarioAtualizado=await response.json();localStorage.setItem('usuario',JSON.stringify(usuarioAtualizado));setSucessoMsg(true);setTimeout(()=>setSucessoMsg(false),3000)}
    setLoading(false);
  };

  const excluirConta=async()=>{if(!window.confirm('Esta ação apagará permanentemente sua conta, treinos, dietas, medidas e conexões. Deseja continuar?'))return;const confirmacao=window.prompt('Digite EXCLUIR para confirmar:');if(confirmacao!=='EXCLUIR')return;const r=await apiFetch('/aluno/conta',{method:'DELETE'});if(r.ok){localStorage.clear();navigate('/')}};

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 relative ${
      temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      
      {/* SIDEBAR LATERAL */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 flex">
          {/* OVERLAY COM DESFOQUE */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMenuAberto(false)} 
          />

          {/* GAVETA LATERAL */}
          <aside className={`relative z-10 w-72 max-w-[80vw] h-full flex flex-col justify-between p-4 border-r transition-all duration-300 ${
            temaEscuro ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="space-y-6">
              {/* BOTÃO FECHAR */}
              <div className="flex justify-start">
                <button 
                  onClick={() => setMenuAberto(false)}
                  className={`p-1.5 rounded-lg transition-colors ${temaEscuro ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CARD DE USUÁRIO NA SIDEBAR */}
              <div 
                onClick={() => { setMenuAberto(false); navigate('/aluno/perfil'); }}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                  temaEscuro 
                    ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] flex items-center justify-center shrink-0 overflow-hidden">
                    {formData.foto_url ? (
                      <img src={formData.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold truncate">{formData.nome || 'Aluno'}</p>
                    <p className={`text-[10px] truncate ${temaEscuro ? 'text-neutral-500' : 'text-gray-400'}`}>{formData.email}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${temaEscuro ? 'text-neutral-600' : 'text-gray-400'}`} />
              </div>

              {/* LINKS NAVEGAÇÃO */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => { setMenuAberto(false); navigate('/aluno/perfil'); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro 
                      ? 'bg-neutral-900 text-white border border-neutral-800'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#00AEFF]" />
                    <span>Gerenciar Perfil</span>
                  </div>
                  {/* BOLINHA VERDE NO GERENCIAR PERFIL */}
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </button>

                <button
                  type="button"
                  onClick={() => { setMenuAberto(false); navigate('/aluno/treinos'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Dumbbell className="w-4 h-4 text-[#00AEFF]" />
                  <span>Gerenciar Treinos</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMenuAberto(false); navigate('/aluno/dietas'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Utensils className="w-4 h-4 text-emerald-400" />
                  <span>Gerenciar Dietas</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMenuAberto(false); navigate('/aluno/conexoes'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Link className="w-4 h-4 text-purple-400" />
                  <span>Gerenciar Conexões</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMenuAberto(false); navigate('/aluno/servicos'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Buscar Serviços</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTema}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    temaEscuro ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {temaEscuro ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    <span>{temaEscuro ? 'Modo Claro' : 'Modo Escuro'}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
                    ESC
                  </span>
                </button>
              </nav>
            </div>

            {/* BOTAO SAIR DA CONTA */}
            <div className="pt-4 border-t border-neutral-800">
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
        </div>
      )}

      {/* CABEÇALHO */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
        temaEscuro ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="w-full max-w-none px-5 lg:px-10 py-4 flex justify-between items-center">
          
          {/* BOTAO ABRIR SIDEBAR TRÊS PONTOS */}
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
              temaEscuro
                ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* PERFIL */}
          <div 
            onClick={() => navigate('/aluno/perfil')}
            className="flex items-center gap-3 text-right cursor-pointer group p-1.5 rounded-2xl hover:bg-neutral-800/40 transition-all"
          >
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight group-hover:text-[#00AEFF] transition-colors">
                Olá, <span className="text-[#00AEFF]">{formData.nome || 'Aluno'}</span>!
              </h1>
              <p className={`text-[10px] sm:text-xs font-medium ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                Painel do Aluno
              </p>
            </div>
            <div className="w-10 h-10 bg-[#00AEFF]/15 border border-[#00AEFF]/30 text-[#00AEFF] rounded-2xl flex items-center justify-center font-bold overflow-hidden group-hover:scale-105 transition-transform">
              {formData.foto_url ? (
                <img src={formData.foto_url} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meu Perfil</h1>
          <p className={`text-xs mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-600'}`}>
            Gerencie seus dados de contato e localização para sincronização na busca por profissionais.
          </p>
        </div>

        {sucessoMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-6">
          
          {/* FOTO DE PERFIL */}
          <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-6 ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#00AEFF]/10 border-2 border-[#00AEFF] flex items-center justify-center text-[#00AEFF] overflow-hidden">
                {formData.foto_url ? (
                  <img src={formData.foto_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-[#00AEFF] text-white rounded-full shadow-lg hover:bg-[#0096dc] transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-extrabold">{formData.nome || 'Seu Nome'}</h2>
              <p className={`text-xs ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>{formData.email}</p>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs font-semibold text-[#00AEFF] flex items-center justify-center sm:justify-start gap-1.5 hover:underline"
              >
                <Upload className="w-3.5 h-3.5" /> 
                <span>Carregar foto</span>
              </button>
            </div>
          </div>

          {/* DADOS CADASTRAIS */}
          <div className={`p-6 rounded-3xl border space-y-4 ${
            temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h3 className="text-xs font-extrabold uppercase text-[#00AEFF] tracking-wider">Informações Pessoais & Contato</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                      temaEscuro 
                        ? 'bg-neutral-950 border-neutral-800 text-white focus:border-[#00AEFF]' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#00AEFF]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                  <input
                    type="email"
                    name="email"
                    disabled
                    value={formData.email}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-xs font-semibold outline-none opacity-60 cursor-not-allowed ${
                      temaEscuro ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  WhatsApp / Telefone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                  <input
                    type="text"
                    name="telefone"
                    placeholder="(00) 99999-9999"
                    value={formData.telefone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                      temaEscuro 
                        ? 'bg-neutral-950 border-neutral-800 text-white focus:border-[#00AEFF]' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#00AEFF]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ${temaEscuro ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Cidade
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                  <input
                    type="text"
                    name="cidade"
                    placeholder="Ex: Curitiba - PR"
                    value={formData.cidade}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                      temaEscuro 
                        ? 'bg-neutral-950 border-neutral-800 text-white focus:border-[#00AEFF]' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#00AEFF]'
                    }`}
                  />
                </div>
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#00AEFF] hover:bg-[#0096dc] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Salvar Alterações</span>
          </button>
          <div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={()=>navigate('/aluno/metas')} className="py-3 border border-neutral-800 rounded-xl font-bold flex justify-center gap-2"><Target/>Minhas metas</button><button type="button" onClick={()=>navigate('/aluno/medidas')} className="py-3 border border-neutral-800 rounded-xl font-bold flex justify-center gap-2"><Ruler/>Medidas e fotos</button></div>
          <button type="button" onClick={excluirConta} className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl font-bold flex justify-center gap-2"><Trash2/>Excluir minha conta</button>
        </form>
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 p-4">
        <div className={`max-w-lg mx-auto rounded-full border backdrop-blur-xl shadow-2xl p-2 px-6 flex justify-between items-center transition-colors duration-300 ${
          temaEscuro 
            ? 'bg-neutral-900/90 border-neutral-800/80 text-neutral-400' 
            : 'bg-white/90 border-gray-200/80 text-gray-500'
        }`}>
          <button type="button" onClick={() => navigate('/aluno/dashboard')} className="flex flex-col items-center gap-1 hover:text-white">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Início</span>
          </button>

          <button type="button" onClick={() => navigate('/aluno/treinos')} className="flex flex-col items-center gap-1 hover:text-white">
            <Dumbbell className="w-5 h-5" />
            <span className="text-[10px] font-bold">Treinos</span>
          </button>

          <button type="button" onClick={() => navigate('/aluno/servicos')} className="flex flex-col items-center gap-1 -mt-5 bg-[#00AEFF] text-white p-3 rounded-full shadow-lg">
            <Compass className="w-6 h-6" />
          </button>

          <button type="button" onClick={() => navigate('/aluno/dietas')} className="flex flex-col items-center gap-1 hover:text-white">
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-bold">Dietas</span>
          </button>

          <button type="button" onClick={() => navigate('/aluno/perfil')} className="flex flex-col items-center gap-1 text-[#00AEFF]">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Perfil</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
