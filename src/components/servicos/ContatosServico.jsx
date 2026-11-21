/* eslint-disable react/prop-types */
import { Camera, MessageCircle } from 'lucide-react';
import { linkInstagram, linkWhatsApp } from '../../utils/contatosPublicos';
export default function ContatosServico({perfil}) {
  const whatsapp=linkWhatsApp(perfil.whatsapp),instagram=linkInstagram(perfil.instagram);
  const contato=(nome,url,Icone,cor)=>url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-1.5 rounded-xl border ${cor} px-2 py-2 text-xs sm:text-sm font-semibold`}><Icone size={16} aria-hidden="true"/>{nome}<span className="sr-only"> de {perfil.nome}</span></a>
    : <button type="button" disabled title={`${nome} não informado`} aria-label={`${nome} de ${perfil.nome} não informado`} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border ${cor} px-2 py-2 text-xs sm:text-sm font-semibold opacity-50 cursor-not-allowed`}><Icone size={16} aria-hidden="true"/>{nome}</button>;
  return <div className="flex flex-wrap gap-2" aria-label={`Contatos de ${perfil.nome}`}>
    {contato('WhatsApp',whatsapp,MessageCircle,'border-emerald-600')}
    {contato('Instagram',instagram,Camera,'border-pink-500')}
    {(!whatsapp||!instagram)&&<p className="w-full text-xs opacity-70">Contato em cinza não informado.</p>}
  </div>;
}
