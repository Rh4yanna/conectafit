/* eslint-disable react/prop-types */
import { useEffect,useRef,useId } from 'react';
import { useTheme } from '../../context/ThemeContext';
export default function ModalAlimentacao({titulo,subtitulo,onClose,ocupado,children,desfocarFundo=false,rotuloFechar='Fechar'}){
  const ref=useRef(null),id=useId();const {temaEscuro}=useTheme();
  useEffect(()=>{const anterior=document.activeElement,dialog=ref.current;dialog.showModal();return()=>{dialog.close();if(anterior?.isConnected)anterior.focus();};},[]);
  useEffect(()=>{if(!desfocarFundo)return;const anterior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=anterior;};},[desfocarFundo]);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!ocupado)onClose();}} className={`w-[min(95vw,850px)] max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl p-5 sm:p-7 backdrop:bg-black/75 ${desfocarFundo?'backdrop:backdrop-blur-sm':''} ${temaEscuro?'bg-neutral-900 text-white':'bg-white text-gray-900'}`}>
    <header className="flex items-start justify-between gap-4 mb-5"><div className="min-w-0"><h2 id={id} className="text-xl font-bold break-words">{titulo}</h2>{subtitulo && <div className="mt-2">{subtitulo}</div>}</div><button type="button" disabled={ocupado} className="acao-secundaria shrink-0" onClick={onClose} aria-label="Fechar">{rotuloFechar}</button></header>{children}
  </dialog>;
}
