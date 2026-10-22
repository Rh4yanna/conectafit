import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(null);
export function ThemeProvider({children}) {
  const [tema,setTema]=useState(()=>{
    const salvo=localStorage.getItem('tema_conectafit');
    if(['dark','light'].includes(salvo))return salvo;
    return localStorage.getItem('temaEscuro')==='false'?'light':'dark';
  });
  useEffect(()=>{
    document.documentElement.classList.toggle('dark',tema==='dark');
    document.documentElement.classList.toggle('light',tema==='light');
    document.documentElement.classList.toggle('tema-claro',tema==='light');
    document.documentElement.style.colorScheme=tema;
    localStorage.setItem('tema_conectafit',tema);
  },[tema]);
  useEffect(()=>{
    const sincronizar=e=>{if(e.key==='tema_conectafit'&&['dark','light'].includes(e.newValue))setTema(e.newValue);};
    window.addEventListener('storage',sincronizar);
    return ()=>window.removeEventListener('storage',sincronizar);
  },[]);
  const setTemaEscuro=valor=>setTema(anterior=>(typeof valor==='function'?valor(anterior==='dark'):valor)?'dark':'light');
  const alternarTema=()=>setTema(anterior=>anterior==='dark'?'light':'dark');
  return <ThemeContext.Provider value={{tema,temaEscuro:tema==='dark',setTemaEscuro,alternarTema}}>{children}</ThemeContext.Provider>;
}
export function useTheme(){return useContext(ThemeContext);}

ThemeProvider.propTypes = {children: PropTypes.node};
