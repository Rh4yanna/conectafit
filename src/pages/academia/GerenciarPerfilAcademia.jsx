import React, { useState, useEffect } from 'react';
import { Building2, Mail, Shield, Save, CheckCircle2, MapPin, Phone, Upload, X, Loader2 } from 'lucide-react';
import { API_URL as API_BASE } from '../../config/api';

export default function GerenciarPerfilAcademia() {
  const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario') || '{}'
  );

  const [form, setForm] = useState({
    nome: usuarioLogado?.nome || '',
    email: usuarioLogado?.email || '',
    cnpj: usuarioLogado?.cnpj || '',
    telefone: usuarioLogado?.telefone || '',
    cidade: usuarioLogado?.cidade || '',
    endereco: usuarioLogado?.endereco || '',
    bio: usuarioLogado?.bio || '', preco_diaria:'', preco_mensal:'', preco_anual:'', modalidades:[], videos:[]
  });

  const [fotos, setFotos] = useState([]);
  const [salvo, setSalvo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const API_URL = `${API_BASE}/academia/perfil`;

  // Buscar dados no PostgreSQL
  useEffect(() => {
    async function carregarPerfil() {
      if (!usuarioLogado?.id) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        const res = await fetch(`${API_URL}/${usuarioLogado.id}`);
        if (res.ok) {
          const dados = await res.json();
          if (dados) {
            setForm({
              nome: dados.nome || '',
              email: dados.email || '',
              cnpj: dados.cnpj || '',
              telefone: dados.telefone || '',
              cidade: dados.cidade || '',
              endereco: dados.endereco || '',
              bio: dados.bio || '', preco_diaria:dados.preco_diaria||'', preco_mensal:dados.preco_mensal||'', preco_anual:dados.preco_anual||'', modalidades:dados.modalidades||[], videos:dados.videos||[]
            });
            setFotos(dados.fotos || []);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar perfil do banco:", err);
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [usuarioLogado?.id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotos((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveFoto = (indexToRemove) => {
    setFotos(fotos.filter((_, index) => index !== indexToRemove));
  };

  // Salvar alterações no PostgreSQL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);

    const payload = {
      usuario_id: usuarioLogado.id,
      ...form,
      fotos
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      } else {
        alert("Erro ao salvar dados no servidor.");
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl w-full max-w-none text-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-neutral-400 font-bold">Buscando dados no banco...</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 lg:p-8 rounded-3xl w-full max-w-none space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Perfil da Academia</h2>
          <p className="text-xs text-neutral-400">Gerencie os dados institucionais e fotos da sua unidade</p>
        </div>
      </div>

      {salvo && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4" /> Informações salvas com sucesso no banco!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-neutral-400 font-bold mb-1">Nome Fantasia / Unidade</label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-400 font-bold mb-1">E-mail de Contato</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-bold mb-1">CNPJ</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="cnpj"
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-neutral-400 font-bold mb-1">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-bold mb-1">Cidade</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="cidade"
                placeholder="São Paulo - SP"
                value={form.cidade}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-bold mb-1">Endereço Completo</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="endereco"
                placeholder="Rua, Número - Bairro"
                value={form.endereco}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-neutral-400 font-bold mb-1">Descrição / Modalidades</label>
          <textarea
            name="bio"
            rows="3"
            placeholder="Descreva a estrutura da sua academia, modalidades oferecidas..."
            value={form.bio}
            onChange={handleChange}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-neutral-400 font-bold mb-2">Fotos da Estrutura</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {fotos.map((foto, index) => (
              <div key={index} className="relative group rounded-xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-950">
                <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">{[['preco_diaria','Diária (R$)'],['preco_mensal','Mensal (R$)'],['preco_anual','Anual (R$)']].map(([nome,label])=><label key={nome} className="text-neutral-400 font-bold">{label}<input type="number" step="0.01" name={nome} value={form[nome]} onChange={handleChange} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white"/></label>)}</div>
          <label className="block text-neutral-400 font-bold mb-4">Modalidades (separadas por vírgula)<input value={(form.modalidades||[]).join(', ')} onChange={e=>setForm({...form,modalidades:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white" placeholder="Musculação, Pilates, Funcional"/></label>
          <label className="block text-neutral-400 font-bold mb-4">URLs dos vídeos (separadas por vírgula)<input value={(form.videos||[]).join(', ')} onChange={e=>setForm({...form,videos:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white"/></label>
          <button
                  type="button"
                  onClick={() => handleRemoveFoto(index)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <label className="border-2 border-dashed border-neutral-800 hover:border-orange-500/50 bg-neutral-950/50 hover:bg-neutral-950 transition-all rounded-xl flex flex-col items-center justify-center cursor-pointer p-4 aspect-video">
              <Upload className="w-5 h-5 text-neutral-500 mb-1" />
              <span className="text-[10px] font-bold text-neutral-400 text-center">Enviar Foto</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 text-black py-3 rounded-xl font-bold transition-colors mt-2"
        >
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
}
