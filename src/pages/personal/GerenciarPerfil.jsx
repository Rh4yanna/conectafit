import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Phone, 
  MessageCircle, 
  GraduationCap, 
  FileText, 
  DollarSign, 
  Save, 
  ExternalLink,
  Camera,
  Share2,
  Upload
} from 'lucide-react';
import { API_URL } from '../../config/api';

export default function GerenciarPerfil() {
  const getUsuarioSalvo = () => {
    try {
      const item = localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado");
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  };

  const usuarioSalvo = getUsuarioSalvo();
  const usuarioId = usuarioSalvo?.id || null;

  const [form, setForm] = useState({
    nome: usuarioSalvo?.nome || '',
    foto_perfil: '',
    cidade: '',
    contato: '',
    whatsapp: '',
    instagram: '',
    formacao: '',
    sobre_mim: '',
    preco_diaria: '',
    preco_semanal: '',
    preco_mensal: '',
    preco_anual: ''
  });

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;

    fetch(`${API_URL}/personal/perfil/${usuarioId}`)
      .then(res => {
        if (!res.ok) throw new Error('Erro na requisição');
        return res.json();
      })
      .then(data => { 
        if (data && typeof data === 'object') {
          setForm(prev => ({ ...prev, ...data }));
        } 
      })
      .catch(err => console.error("Erro ao carregar perfil:", err));
  }, [usuarioId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // UPLOAD DA FOTO DE PERFIL DA GALERIA / ARQUIVOS
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada deve ter menos de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, foto_perfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const response = await fetch(`${API_URL}/personal/perfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, usuario_id: usuarioId })
      });

      if (response.ok) {
        alert('Perfil atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar perfil no servidor.');
      }
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert('Erro ao salvar o perfil. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="w-full max-w-none px-5 lg:px-10 py-6 text-white font-sans">
      
      {/* CABEÇALHO */}
      <div className="mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#00AEFF]" /> Gerenciar Perfil
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Configure suas informações públicas, formas de contato e valores de consultoria/treino.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SEÇÃO 1: DADOS BÁSICOS & FOTO */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Camera className="w-4 h-4 text-[#00AEFF]" /> Informações Básicas
          </h2>

          {/* PREVIEW E UPLOAD DA FOTO */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pb-2 border-b border-neutral-800">
            <div className="w-20 h-20 rounded-full bg-neutral-950 border-2 border-[#00AEFF] flex items-center justify-center overflow-hidden shrink-0">
              {form.foto_perfil ? (
                <img src={form.foto_perfil} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-neutral-600" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <label className="text-xs font-bold text-neutral-400 block mb-1">Foto de Perfil</label>
              <label 
                htmlFor="upload-foto" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-[#00AEFF]" />
                Escolher Foto da Galeria
              </label>
              <input 
                id="upload-foto"
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Formatos aceitos: JPG, PNG, WEBP (Max: 5MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Nome Completo</label>
              <input 
                type="text" 
                name="nome" 
                placeholder="Seu nome exibido no app" 
                value={form.nome || ''} 
                onChange={handleChange} 
                required 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Cidade / Região de Atuação</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  name="cidade" 
                  placeholder="Ex: São Paulo - SP" 
                  value={form.cidade || ''} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: CONTATO & REDES SOCIAIS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Phone className="w-4 h-4 text-[#00AEFF]" /> Contato e Redes Sociais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Telefone Principal</label>
              <input 
                type="text" 
                name="contato" 
                placeholder="(00) 00000-0000" 
                value={form.contato || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">WhatsApp (Apenas Números)</label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  name="whatsapp" 
                  placeholder="5511999999999" 
                  value={form.whatsapp || ''} 
                  onChange={handleChange} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Instagram (Sem @)</label>
              <div className="relative">
                <Share2 className="w-4 h-4 text-pink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  name="instagram" 
                  placeholder="seu.usuario" 
                  value={form.instagram || ''} 
                  onChange={handleChange} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>
            </div>
          </div>

          {(form.whatsapp || form.instagram) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {form.whatsapp && (
                <a 
                  href={`https://wa.me/${String(form.whatsapp).replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Testar WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {form.instagram && (
                <a 
                  href={`https://instagram.com/${String(form.instagram).replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-1.5 rounded-lg hover:bg-pink-500/20 transition-all font-bold"
                >
                  <Share2 className="w-3.5 h-3.5" /> Testar Instagram <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* SEÇÃO 3: SOBRE & FORMAÇÃO */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <GraduationCap className="w-4 h-4 text-[#00AEFF]" /> Perfil Profissional
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Formação / Certificações</label>
              <input 
                type="text" 
                name="formacao" 
                placeholder="Ex: Bacharel em Educação Física" 
                value={form.formacao || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Sobre Mim (Biografia)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <textarea 
                  name="sobre_mim" 
                  rows="4"
                  placeholder="Escreva sobre sua metodologia de trabalho..." 
                  value={form.sobre_mim || ''} 
                  onChange={handleChange} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: PLANOS E VALORES */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <DollarSign className="w-4 h-4 text-[#00AEFF]" /> Valores dos Planos (R$)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Diária</label>
              <input 
                type="number" 
                step="0.01" 
                name="preco_diaria" 
                placeholder="R$ 0,00" 
                value={form.preco_diaria || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Semanal</label>
              <input 
                type="number" 
                step="0.01" 
                name="preco_semanal" 
                placeholder="R$ 0,00" 
                value={form.preco_semanal || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Mensal</label>
              <input 
                type="number" 
                step="0.01" 
                name="preco_mensal" 
                placeholder="R$ 0,00" 
                value={form.preco_mensal || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Anual</label>
              <input 
                type="number" 
                step="0.01" 
                name="preco_anual" 
                placeholder="R$ 0,00" 
                value={form.preco_anual || ''} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          className="w-full py-3.5 bg-[#00AEFF] hover:bg-blue-600 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-5 h-5" />
          {carregando ? 'Salvando Alterações...' : 'Salvar Perfil'}
        </button>

      </form>
    </div>
  );
}
