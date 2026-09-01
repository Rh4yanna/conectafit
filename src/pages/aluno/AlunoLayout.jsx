import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

export default function AlunoLayout() {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('tema_aluno') || 'dark';
  });

  const alternarTema = () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    localStorage.setItem('tema_aluno', novoTema);
  };

  const eEscuro = tema === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      eEscuro ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* O Outlet injeta as telas (DashboardAluno, BuscarServicos, etc.) e passa o tema */}
      <Outlet context={{ tema, eEscuro, alternarTema }} />
    </div>
  );
}