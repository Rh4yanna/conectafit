/* eslint-disable react/prop-types */
import { useLayoutEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function MenuInferior({ children, label }) {
  const { temaEscuro } = useTheme();
  const footer = useRef(null);
  useLayoutEffect(() => {
    const elemento = footer.current;
    const layout = elemento.closest('[data-menu-inferior]');
    const atualizar = () => {
      const altura = `${elemento.getBoundingClientRect().height ? Math.ceil(elemento.getBoundingClientRect().height) + 24 : 24}px`;
      layout?.style.setProperty('padding-bottom', altura);
      document.documentElement.style.setProperty('--espaco-menu-inferior', altura);
    };
    atualizar();
    const observer = new ResizeObserver(atualizar); observer.observe(elemento);
    return () => { observer.disconnect(); layout?.style.removeProperty('padding-bottom'); document.documentElement.style.removeProperty('--espaco-menu-inferior'); };
  }, []);
  return <footer ref={footer} className="app-bottom-nav fixed bottom-0 inset-x-0 z-40 p-4 pointer-events-none" style={{paddingBottom:'calc(.5rem + env(safe-area-inset-bottom, 0px))'}}>
    <nav aria-label={label} className={`max-w-lg mx-auto border rounded-full px-4 sm:px-6 py-3 flex justify-between items-center shadow-xl pointer-events-auto ${temaEscuro?'bg-neutral-950 text-white border-neutral-800':'bg-white text-gray-900 border-gray-200'}`}>
      {children}
    </nav>
  </footer>;
}
