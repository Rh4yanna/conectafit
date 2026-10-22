import MensagemTemporaria from '../../components/MensagemTemporaria';
import OfertaServico from '../../components/servicos/OfertaServico';
import LocalAtendimento from '../../components/LocalAtendimento';
import { useState, useEffect } from 'react';
import {
  User,

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
import { apiFetch } from '../../config/api';

export default function GerenciarPerfilNutri(){
 const usuario=JSON.parse(localStorage.getItem('usuario')||'{}');
 const [form,setForm]=useState({nome:usuario.nome||''}),[salvo,setSalvo]=useState(false),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true),[ocupado,setOcupado]=useState(false),[tentativa,setTentativa]=useState(0),[pronto,setPronto]=useState(false);
 useEffect(()=>{let ativo=true;setCarregando(true);setErro('');apiFetch('/nutri/perfil/me').then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar seu perfil.');const d=await r.json();if(ativo){if(d)setForm(d);setPronto(true);}}).catch(e=>{if(ativo)setErro(e.message);}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[tentativa]);
 const enviar=async e=>{e.preventDefault();if(ocupado||!pronto)return;setOcupado(true);setErro('');setSalvo(false);try{const r=await apiFetch('/nutri/perfil/me',{method:'PUT',body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível salvar seu perfil.');setForm(d);setSalvo(true);}catch(e){setErro(e.message);}finally{setOcupado(false);}};
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // UPLOAD DA FOTO DE PERFIL DA GALERIA / ARQUIVOS
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {setErro('Selecione uma imagem JPG, PNG ou WEBP.');return;}
    if (file.size > 600 * 1024) {
      setErro("Selecione uma imagem de até 600 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setErro('Não foi possível ler a foto. Tente novamente.');
    reader.onload = () => {
      setForm(prev => ({ ...prev, foto_perfil: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-none px-5 lg:px-10 py-6 text-white font-sans">

      {erro&&<MensagemTemporaria as="p" role="alert" className="text-red-400">{erro}{!pronto&&<button className="acao-secundaria ml-2" onClick={()=>setTentativa(n=>n+1)}>Tentar novamente</button>}</MensagemTemporaria>}{salvo&&<MensagemTemporaria as="p" role="status">Perfil salvo.</MensagemTemporaria>}{!pronto&&!erro&&<p role="status">Carregando perfil...</p>}
      {/* CABEÇALHO */}
      <div className="mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#00AEFF]" /> Gerenciar Perfil
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Configure suas informações públicas, formas de contato e valores de acompanhamento nutricional.
        </p>
      </div>

      <form id="perfil-nutri" aria-label="Perfil do nutricionista" onSubmit={enviar}/>
      <fieldset disabled={!pronto||carregando||ocupado} className="space-y-6">

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
              <input form="perfil-nutri"
                id="upload-foto"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Formatos aceitos: JPG, PNG, WEBP (Max: 600 KB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Nome Completo</label>
              <input form="perfil-nutri"
                type="text"
                name="nome" aria-label="Nome completo"
                placeholder="Seu nome exibido no app"
                value={form.nome || ''}
                onChange={handleChange}
                required
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>


          </div>
        </div>

        {/* SEÇÃO 2: CONTATO & REDES SOCIAIS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Phone className="w-4 h-4 text-[#00AEFF]" /> Contato e Redes Sociais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm">E-mail de contato<input form="perfil-nutri" type="email" name="email_contato" value={form.email_contato||''} onChange={handleChange} className="block w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3"/></label>
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Telefone Principal</label>
              <input form="perfil-nutri"
                type="text"
                name="contato" aria-label="Telefone principal"
                placeholder="(00) 00000-0000"
                value={form.contato || ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">WhatsApp (Apenas Números)</label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-sky-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input form="perfil-nutri"
                  type="text"
                  name="whatsapp" aria-label="WhatsApp"
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
                <input form="perfil-nutri"
                  type="text"
                  name="instagram" aria-label="Instagram"
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
                  className="flex items-center gap-2 text-xs bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg hover:bg-sky-500/20 transition-all font-bold"
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

        <LocalAtendimento cidadeInicial={form.cidade} onEnderecoSalvo={endereco=>setForm(prev=>({...prev,cidade:endereco.cidade}))}/>
        {/* SEÇÃO 3: SOBRE & FORMAÇÃO */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <GraduationCap className="w-4 h-4 text-[#00AEFF]" /> Perfil Profissional
          </h2>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-neutral-400">CRN<input form="perfil-nutri" name="crn" maxLength={300} value={form.crn||''} onChange={handleChange} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF]"/></label>
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Formação / Certificações</label>
              <input form="perfil-nutri"
                type="text"
                name="formacao" aria-label="Formação"
                placeholder="Ex: Bacharel em Nutrição"
                value={form.formacao || ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Sobre Mim (Biografia)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <textarea form="perfil-nutri"
                  name="bio" aria-label="Sobre mim"
                  rows="4"
                  placeholder="Escreva sobre sua metodologia de trabalho..."
                  value={form.bio || ''}
                  onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: PLANOS E VALORES */}
        <OfertaServico/>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
            <DollarSign className="w-4 h-4 text-[#00AEFF]" /> Valores dos Planos (R$)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Diária</label>
              <input form="perfil-nutri"
                type="number"
                step="0.01"
                name="preco_diaria" aria-label="Diária (R$)"
                placeholder="R$ 0,00"
                value={form.preco_diaria ?? ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Semanal</label>
              <input form="perfil-nutri"
                type="number"
                step="0.01"
                name="preco_semanal" aria-label="Semanal (R$)"
                placeholder="R$ 0,00"
                value={form.preco_semanal ?? ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Mensal</label>
              <input form="perfil-nutri"
                type="number"
                step="0.01"
                name="preco_mensal" aria-label="Mensal (R$)"
                placeholder="R$ 0,00"
                value={form.preco_mensal ?? ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">Anual</label>
              <input form="perfil-nutri"
                type="number"
                step="0.01"
                name="preco_anual" aria-label="Anual (R$)"
                placeholder="R$ 0,00"
                value={form.preco_anual ?? ''}
                onChange={handleChange}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00AEFF] transition-colors"
              />
            </div>
          </div>
        </div>

        <button form="perfil-nutri"
          type="submit"
          disabled={carregando||ocupado||!pronto}
          className="w-full py-3.5 bg-[#00AEFF] hover:bg-sky-600 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-[#00AEFF]/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-5 h-5" />
          {ocupado ? 'Salvando Alterações...' : 'Salvar Perfil'}
        </button>

      </fieldset>
    </div>
  );
}
