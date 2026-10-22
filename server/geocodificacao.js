import {normalizarEndereco} from './enderecos.js';
import {coordenadasValidas} from '../src/utils/localizacao.js';
export async function localizarEndereco(body,chave,consultar=fetch){
 const endereco=normalizarEndereco(body);
 if(!chave)throw Object.assign(new Error('A busca de endereços ainda não foi configurada. Use sua localização estando na academia.'),{status:503});
 const query=new URLSearchParams({text:`${endereco.rua}, ${endereco.numero}, ${endereco.cidade}, ${endereco.estado}, Brasil`,filter:'countrycode:br',lang:'pt',format:'json',limit:'5',apiKey:chave});
 let r;
 try{r=await consultar(`https://api.geoapify.com/v1/geocode/search?${query}`,{signal:AbortSignal.timeout(12000)});}catch{throw new Error('Não foi possível consultar o endereço. Tente novamente.');}
 if(!r.ok)throw new Error('O serviço de endereços está indisponível. Tente novamente mais tarde.');
 const d=await r.json();
 return (d.results||[]).filter(p=>p.country_code==='br'&&['building','amenity'].includes(p.result_type)&&coordenadasValidas(p.lat,p.lon)).map(p=>({endereco:p.formatted,latitude:p.lat,longitude:p.lon}));
}
