import { useTheme } from '../../context/ThemeContext';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  Camera,
  Upload,
  Loader2,
  AlertCircle, X, Trash2
} from 'lucide-react';
import { apiFetch } from '../../config/api';

function formatarTelefone(valor) {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (!numeros) return '';
  if (numeros.length <= 2) return `(${numeros}`;
  const contato = numeros.slice(2);
  const corte = contato.length > 8 ? 5 : 4;
  return `(${numeros.slice(0, 2)}) ${contato.slice(0, corte)}${contato.length > corte ? '-' + contato.slice(corte) : ''}`;
}

export default function MeuPerfil() {
  const navigate = useNavigate();

  // DADOS DO USUÁRIO NO LOCALSTORAGE
  const [usuarioSalvo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || {
        nome: 'Aluno',
        email: '',
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
  const {temaEscuro} = useTheme();

  // ESTADOS GERAIS
  const fileInputRef = useRef(null);
  const [aviso, setAviso] = useState(null);
  const [loading, setLoading] = useState(false);

  // FORMULÁRIO DE PERFIL
  const [formData, setFormData] = useState({
    id: usuarioSalvo.id || '',
    nome: usuarioSalvo.nome || '',
    email: usuarioSalvo.email || '',
    telefone: formatarTelefone(usuarioSalvo.telefone || usuarioSalvo.whatsapp),
    cidade: usuarioSalvo.cidade || '',
    endereco: usuarioSalvo.endereco || '',
    tipo_usuario: usuarioSalvo.tipo_usuario || 'aluno',
    foto_url: usuarioSalvo.foto_url || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAviso(null);
    setFormData(prev => ({ ...prev, [name]: name === 'telefone' ? formatarTelefone(value) : value }));
  };

  // UPLOAD DE IMAGEM LOCAL
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAviso(null);
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, foto_url: reader.result }));
      };
      reader.onerror = () => setAviso({tipo:'erro', mensagem:'Não foi possível carregar a foto. Escolha o arquivo novamente.'});
      reader.readAsDataURL(file);
    }
  };

  // SALVAR ALTERAÇÕES
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (loading) return;
    setAviso(null);
    setLoading(true);
    try {
      const response = await apiFetch('/aluno/perfil',{method:'PUT',body:JSON.stringify(formData)});
      const dados = await response.json().catch(() => null);
      if (!response.ok) throw new Error(dados?.message || 'Não foi possível salvar seu perfil. Tente novamente.');
      if (!dados) throw new Error('Não foi possível confirmar a atualização. Tente novamente.');
      localStorage.setItem('usuario',JSON.stringify(dados));
      setAviso({tipo:'sucesso', mensagem:'Suas alterações foram salvas.'});
    } catch (erro) {
      setAviso({tipo:'erro', mensagem:erro.message || 'Não foi possível conectar. Tente novamente.'});
    } finally {
      setLoading(false);
    }
  };

  const excluirConta=async()=>{if(!window.confirm('Esta ação apagará permanentemente sua conta, treinos, dietas, medidas e conexões. Deseja continuar?'))return;const confirmacao=window.prompt('Digite EXCLUIR para confirmar:');if(confirmacao!=='EXCLUIR')return;const r=await apiFetch('/aluno/conta',{method:'DELETE'});if(r.ok){localStorage.clear();navigate('/')}};

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased pb-28 relative ${
      temaEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>



      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meu Perfil</h1>
          <p className={`text-xs mt-1 ${temaEscuro ? 'text-neutral-400' : 'text-gray-600'}`}>
            Gerencie seus dados de contato e localização para sincronização na busca por profissionais.
          </p>
        </div>

        {aviso && (
          <div role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl border shadow-xl flex items-start gap-3 ${temaEscuro ? 'bg-neutral-900 text-white' : 'bg-white text-gray-900'} ${aviso.tipo === 'erro' ? 'border-red-500/50' : 'border-sky-500/50'}`}>
            {aviso.tipo === 'erro' ? <AlertCircle className="w-6 h-6 text-red-400 shrink-0"/> : <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0"/>}
            <div className="flex-1"><p className="font-bold text-sm">{aviso.tipo === 'erro' ? 'Não foi possível salvar' : 'Perfil atualizado!'}</p><p className="text-sm mt-1">{aviso.mensagem}</p></div>
            <button type="button" aria-label="Fechar mensagem" onClick={()=>setAviso(null)} className="p-1 rounded-lg hover:bg-neutral-500/10"><X size={18}/></button>
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
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-label="WhatsApp / Telefone"
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
          <button type="button" onClick={excluirConta} className="w-full py-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl font-bold flex justify-center gap-2"><Trash2/>Excluir minha conta</button>
        </form>
      </main>

      {/* FOOTER FIXO */}


    </div>
  );
}
