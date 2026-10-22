import { useEffect, useRef, useState } from 'react';

export default function FeedbackOperacoes() {
  const [aviso, setAviso] = useState(null);
  const painel = useRef(null);
  useEffect(() => {
    const receber = e => setAviso({ ...e.detail, id: crypto.randomUUID() });
    window.addEventListener('conectafit-feedback', receber);
    return () => window.removeEventListener('conectafit-feedback', receber);
  }, []);
  useEffect(() => {
    if (!aviso) return;
    if (painel.current?.showPopover && !painel.current.matches(':popover-open')) painel.current.showPopover();
    const timer = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(timer);
  }, [aviso]);
  if (!aviso) return null;
  return <aside ref={painel} popover="manual" aria-label="Resultado da operação" className="fixed z-[100] m-0 p-0 border-0 bg-transparent text-gray-900" style={{inset:'auto',top:'calc(1rem + env(safe-area-inset-top, 0px))',right:'1rem',width:'min(26rem, calc(100vw - 2rem))'}}>
    <div className={`flex items-start gap-3 border-l-4 rounded-xl p-4 bg-white shadow-xl ${aviso.tipo==='erro'?'border-red-600':'border-emerald-600'}`}>
      <div key={aviso.id} role={aviso.tipo==='erro'?'alert':'status'} aria-atomic="true" className="min-w-0 flex-1 break-words"><p className="font-bold">{aviso.tipo==='erro'?'Não foi possível concluir':'Sucesso'}</p><p className="text-sm mt-1">{aviso.texto}</p></div>
      <button type="button" className="rounded-lg border border-gray-300 px-2 py-1 text-sm shrink-0" onClick={()=>setAviso(null)} aria-label="Fechar mensagem da operação">Fechar</button>
    </div>
  </aside>;
}
