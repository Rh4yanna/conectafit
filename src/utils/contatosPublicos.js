export function linkWhatsApp(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  let texto=valor.trim();
  if (/^https?:\/\//i.test(texto)) {
    try { const u=new URL(texto); if(!['wa.me','api.whatsapp.com'].includes(u.hostname))return null;texto=u.hostname==='wa.me'?u.pathname.slice(1):u.searchParams.get('phone')||''; } catch { return null; }
  }
  if(!/^[+\d\s().-]+$/.test(texto))return null;
  let numero=texto.replace(/\D/g,'');
  if(!texto.startsWith('+')&&[10,11].includes(numero.length))numero=`55${numero}`;
  return /^[1-9]\d{9,14}$/.test(numero)?`https://wa.me/${numero}`:null;
}
export function linkInstagram(valor) {
  if(typeof valor!=='string'||!valor.trim())return null;
  let nome=valor.trim();
  if(/^(https?:\/\/|www\.|instagram\.com\/)/i.test(nome)) {
    try {const u=new URL(/^https?:\/\//i.test(nome)?nome:`https://${nome}`);if(!['instagram.com','www.instagram.com'].includes(u.hostname))return null;nome=u.pathname.replace(/^\/|\/$/g,'');}catch{return null;}
  }
  nome=nome.replace(/^@/,'');
  return /^[a-zA-Z0-9._]{1,30}$/.test(nome)?`https://www.instagram.com/${nome}/`:null;
}
export function fotoPublica(valor) {
  if(typeof valor==='string'&&/^\/api\/midia\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(valor))return valor;
  if(typeof valor!=='string')return null;
  if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(valor))return valor;
  try{const u=new URL(valor);return u.protocol==='https:'?u.href:null;}catch{return null;}
}
export function enderecoPublico(p) {
  return [p.rua?[p.rua,p.numero].filter(Boolean).join(', '):p.endereco,p.cidade,p.estado].filter(v=>typeof v==='string'&&v.trim()).join(' · ');
}
