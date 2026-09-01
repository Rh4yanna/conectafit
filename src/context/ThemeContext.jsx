import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 1. Busca o tema salvo no localStorage (ou padrão 'dark')
  const [tema, setTema] = useState(() => {
    return localStorage.getItem("tema_conectafit") || "dark";
  });

  // 2. Aplica ou remove a classe na tag <html> sempre que o tema mudar
  useEffect(() => {
    const root = document.documentElement;
    if (tema === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    // Salva a escolha no navegador para não perder no F5 ou navegação
    localStorage.setItem("tema_conectafit", tema);
  }, [tema]);

  // Função para alternar o tema
  const alternarTema = () => {
    setTema((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}