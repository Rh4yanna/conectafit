import { apiFetch } from '../../config/api';
export async function alimentacao(path,method='GET',body){
  let r;
  try{r=await apiFetch(`/alimentacao${path}`,{method,signal:AbortSignal.timeout(30000),...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw new Error('Não foi possível conectar. Seus dados continuam na tela; tente novamente.');}
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível completar a operação.');return d;
}
export const hoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
export const dataBR=data=>data?.slice(0,10).split('-').reverse().join('/');
export const quantidade=a=>`${Number(a.quantidade??a.quantidade_gramas).toLocaleString('pt-BR')} ${a.unidade||'g'}`;
export const rotulosRegistro={realizada:'Realizada',parcial:'Realizada parcialmente',nao_realizada:'Não realizada'};
