/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../assets/fescuro.png';
import './AberturaAplicacao.css';

const Contexto = createContext({ iniciar: () => {}, pronta: () => {} });
function PersonagensAnimados() {
  const id = useId().replace(/:/g, '');
  const esquerdo = 'M0 0H580V780H440L470 970L480 1050H0Z';
  const direito = 'M2000 0H1420V780H1560L1530 970L1520 1050H2000Z';
  return <svg className="abertura-personagens" viewBox="0 0 2000 2000" role="img" aria-label="Personagens da marca ConectaFit movimentando os pesos">
    <defs>
      <clipPath id={`${id}-esquerdo`}><path d={esquerdo}/></clipPath>
      <clipPath id={`${id}-direito`}><path d={direito}/></clipPath>
      <mask id={`${id}-corpo`} maskUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2000">
        <rect width="2000" height="2000" fill="white"/>
        <path d="M0 0H580V780H440L470 970L472 1020H0Z M2000 0H1420V780H1560L1530 970L1528 1020H2000Z" fill="black"/>
      </mask>
    </defs>
    <image href={logo} width="2000" height="2000" mask={`url(#${id}-corpo)`}/>
    <g className="abertura-braco abertura-braco-esquerdo"><image href={logo} width="2000" height="2000" clipPath={`url(#${id}-esquerdo)`}/></g>
    <g className="abertura-braco abertura-braco-direito"><image href={logo} width="2000" height="2000" clipPath={`url(#${id}-direito)`}/></g>
  </svg>;
}
export const useAbertura = () => useContext(Contexto);
export function useTelaInicialPronta(pronta) {
  const { pronta: informar } = useAbertura();
  useEffect(() => { if (pronta) informar(); }, [pronta, informar]);
}

export default function AberturaAplicacao({ children }) {
  const { pathname } = useLocation();
  const [abertura, setAbertura] = useState(null);
  const [tempoCumprido, setTempoCumprido] = useState(false);
  const [dadosProntos, setDadosProntos] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [reduzido, setReduzido] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const foco = useRef(null);
  const conteudo = useRef(null);
  const destinoAlcancado = useRef(false);
  const iniciar = useCallback(destino => {
    destinoAlcancado.current = false;
    setTempoCumprido(false); setDadosProntos(false); setSaindo(false);
    setAbertura({ destino, origem: pathname });
  }, [pathname]);
  const pronta = useCallback(() => setDadosProntos(true), []);
  const contexto = useMemo(() => ({ iniciar, pronta }), [iniciar, pronta]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const atualizar = () => setReduzido(media.matches);
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);
  useEffect(() => {
    if (!abertura) return;
    const timer = setTimeout(() => setTempoCumprido(true), reduzido ? 200 : 2750);
    return () => clearTimeout(timer);
  }, [abertura, reduzido]);
  useEffect(() => {
    if (!abertura || !tempoCumprido || !dadosProntos) return;
    setSaindo(true);
    const timer = setTimeout(() => {
      setAbertura(null);
      requestAnimationFrame(() => conteudo.current?.querySelector('#conteudo-principal')?.focus({ preventScroll: true }));
    }, reduzido ? 100 : 250);
    return () => clearTimeout(timer);
  }, [abertura, tempoCumprido, dadosProntos, reduzido]);
  useEffect(() => {
    if (!abertura) return;
    foco.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, [abertura]);
  useEffect(() => {
    const cancelar = () => setAbertura(null);
    window.addEventListener('conectafit-logout', cancelar);
    window.addEventListener('conectafit-sessao-expirada', cancelar);
    return () => {
      window.removeEventListener('conectafit-logout', cancelar);
      window.removeEventListener('conectafit-sessao-expirada', cancelar);
    };
  }, []);
  useEffect(() => {
    if (!abertura) return;
    if (pathname === abertura.destino) destinoAlcancado.current = true;
    else if (destinoAlcancado.current || pathname !== abertura.origem) setAbertura(null);
  }, [pathname, abertura]);

  return <Contexto.Provider value={contexto}>
    <div ref={conteudo} inert={abertura ? '' : undefined} aria-hidden={abertura ? true : undefined} style={abertura && !saindo ? { visibility: 'hidden' } : undefined}>{children}</div>
    {abertura && <div className={`abertura-app${saindo ? ' abertura-app-saindo' : ''}`} ref={foco} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="abertura-marca" aria-describedby="abertura-status">
      <div className="abertura-composicao">
        <h1 id="abertura-marca">Conecta<span>Fit</span></h1>
        <PersonagensAnimados />
        <div className="abertura-progresso" aria-hidden="true"><span /></div>
        <p id="abertura-status" role="status">{tempoCumprido && !dadosProntos ? 'Carregando seu espaço…' : 'Seu ritmo. Sua evolução.'}</p>
      </div>
    </div>}
  </Contexto.Provider>;
}
