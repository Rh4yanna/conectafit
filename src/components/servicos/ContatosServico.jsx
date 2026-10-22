/* eslint-disable react/prop-types */
import { Camera, MessageCircle } from 'lucide-react';
import { linkInstagram, linkWhatsApp } from '../../utils/contatosPublicos';
export default function ContatosServico({perfil}) {
  const whatsapp=linkWhatsApp(perfil.whatsapp),instagram=linkInstagram(perfil.instagram);
  if(!whatsapp&&!instagram)return null;
  return <div className="flex flex-wrap gap-2" aria-label={`Contatos de ${perfil.nome}`}>
    {whatsapp&&<a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 px-3 py-2 text-sm font-semibold"><MessageCircle size={16} aria-hidden="true"/>WhatsApp<span className="sr-only"> de {perfil.nome}</span></a>}
    {instagram&&<a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-pink-500 px-3 py-2 text-sm font-semibold"><Camera size={16} aria-hidden="true"/>Instagram<span className="sr-only"> de {perfil.nome}</span></a>}
  </div>;
}
