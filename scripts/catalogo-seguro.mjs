import fs from 'node:fs/promises';
import crypto from 'node:crypto';
export function licencaPermitida(l){try{const u=new URL(l?.url);return u.protocol==='https:'&&u.hostname==='creativecommons.org'&&/^\/(licenses\/(by|by-sa)\/(3\.0|4\.0)\/|publicdomain\/zero\/1\.0\/)/.test(u.pathname);}catch{return false;}}
export async function publicarCatalogo(destino,novo){
 const anterior=JSON.parse(await fs.readFile(destino,'utf8'));
 if(!Array.isArray(novo.exercicios)||novo.exercicios.length<50||novo.exercicios.length<anterior.exercicios.filter(e=>!e.indisponivel).length*.7)throw new Error('Catálogo incompleto. A versão anterior foi preservada.');
 const ids=new Set();for(const e of novo.exercicios){if(!e.id||ids.has(e.id)||!e.nome||!Array.isArray(e.videos)||!Array.isArray(e.imagens)||!licencaPermitida(e.licenca))throw new Error('Catálogo inválido. A versão anterior foi preservada.');ids.add(e.id);}
 // Mantém identidade e instruções já utilizadas em fichas. A seleção de novos
 // exercícios não oferece itens retirados pelo fornecedor.
 const removidos=anterior.exercicios.filter(e=>!ids.has(e.id)).map(e=>({...e,indisponivel:true,videos:[],imagens:[]}));
 const temporario=new URL(`exercicios-${crypto.randomUUID()}.tmp`,destino);
 try{await fs.writeFile(temporario,JSON.stringify({...novo,exercicios:[...novo.exercicios,...removidos]},null,2),{flag:'wx'});await fs.rename(temporario,destino);}finally{await fs.rm(temporario,{force:true});}
 return removidos.length;
}
