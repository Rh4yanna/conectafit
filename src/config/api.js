export const API_URL = (import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api')).replace(/\/$/, "");

import { deveNotificar, emitirFeedback, mensagemOperacao } from './feedback';

const pendentes = new Map();
export function apiFetch(path, options = {}) {
  const conta = localStorage.getItem("usuario");
  const metodo = (options.method || 'GET').toUpperCase();
  const notificar = deveNotificar(path, metodo);
  const mutacao = !['GET','HEAD'].includes((options.method || 'GET').toUpperCase());
  const chave = mutacao && !options.signal && typeof options.body === 'string' ? JSON.stringify([conta,path,options.method,options.body]) : null;
  if(chave && pendentes.has(chave)) return pendentes.get(chave).then(r=>r.clone());
  const controle = new AbortController();
  const cancelar=()=>controle.abort();
  if(options.signal?.aborted)controle.abort();
  else options.signal?.addEventListener('abort',cancelar,{once:true});
  const timer = setTimeout(()=>controle.abort(),60000);
  const chamada = fetch(`${API_URL}${path}`, {
    ...options,
    signal: controle.signal,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-ConectaFit-Request": "1",
      ...options.headers,
    },
  }).then(async r=>{
    if(r.status===401)window.dispatchEvent(new Event('conectafit-sessao-expirada'));
    if(notificar) {
      const dados = r.status === 204 ? {} : await r.clone().json().catch(()=>null);
      emitirFeedback(dados === null && r.ok
        ? {tipo:'erro',texto:'Não foi possível confirmar a conclusão da ação. Confira os registros antes de tentar novamente.'}
        : mensagemOperacao(path,metodo,r.ok,dados || {}));
    }
    return r;
  }).catch(e=>{
    if(options.signal?.aborted)throw e;
    const mensagem=mutacao?'Não foi possível confirmar o envio. Seus campos continuam nesta tela. Confira os registros antes de reenviar.':'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.';
    if(notificar)emitirFeedback({tipo:'erro',texto:mensagem});
    throw new Error(mensagem);
  }).finally(()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',cancelar);if(chave)pendentes.delete(chave);});
  if(chave)pendentes.set(chave,chamada);
  return chamada.then(r=>r.clone());
}

export async function encerrarSessao() {
  const r=await apiFetch('/logout',{method:'POST',body:'{}'});
  if(!r.ok)throw new Error('Não foi possível encerrar a sessão. Verifique a conexão e tente novamente.');
  for(const k of ['token','usuario','usuarioLogado'])localStorage.removeItem(k);
  window.dispatchEvent(new Event('conectafit-logout'));
}
