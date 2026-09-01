import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importação do Provider de Tema
import { ThemeProvider } from './context/ThemeContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';

// Dashboards por Perfil
import DashboardAluno from './pages/aluno/DashboardAluno';
import DashboardPersonal from './pages/personal/DashboardPersonal';
import DashboardNutri from './pages/nutri/DashboardNutri';
import DashboardAcademia from './pages/academia/DashboardAcademia';

// Telas do Personal
import GerenciarPerfilPersonal from './pages/personal/GerenciarPerfil';

// Telas do Aluno
import BuscarServicos from './pages/aluno/BuscarServicos';
import MeusTreinos from './pages/aluno/MeusTreinos';
import MinhaDieta from './pages/aluno/MinhaDieta';
import MeuPerfilAluno from './pages/aluno/MeuPerfil';
import MinhasConexoes from './pages/aluno/MinhasConexoes';
import MetasAluno from './pages/aluno/MetasAluno';
import MedidasFotos from './pages/aluno/MedidasFotos';

// Componente Corrigido de Proteção (Sem travamentos falsos)
function RotaProtegida({ children, perfilRequerido }) {
  const usuarioSalvo = localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado");

  // Se não houver nenhum dado do usuário salvo, manda para o login
  if (!usuarioSalvo) {
    return <Navigate to="/login" replace />;
  }

  let usuario = {};
  try {
    usuario = JSON.parse(usuarioSalvo);
  } catch (e) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Normalização flexível do perfil retornado
  let perfilUsuario = (
    usuario.tipo_usuario || 
    usuario.perfil || 
    usuario.tipo || 
    ""
  ).toLowerCase();
  
  if (perfilUsuario === "nutricionista") perfilUsuario = "nutri";

  // Se a rota exige um perfil específico e o usuário logado for diferente, barra o acesso
  if (perfilRequerido && perfilUsuario !== perfilRequerido) {
    console.warn(`Acesso negado: Perfil requerido '${perfilRequerido}', perfil atual '${perfilUsuario}'`);
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          {/* ==================== ROTAS DO ALUNO ==================== */}
          <Route 
            path="/aluno/dashboard" 
            element={
              <RotaProtegida perfilRequerido="aluno">
                <DashboardAluno />
              </RotaProtegida>
            } 
          />
          <Route 
            path="/aluno/servicos" 
            element={
              <RotaProtegida perfilRequerido="aluno">
                <BuscarServicos />
              </RotaProtegida>
            } 
          />
          <Route 
            path="/aluno/treinos" 
            element={
              <RotaProtegida perfilRequerido="aluno">
                <MeusTreinos />
              </RotaProtegida>
            } 
          />
          <Route 
            path="/aluno/dietas" 
            element={
              <RotaProtegida perfilRequerido="aluno">
                <MinhaDieta />
              </RotaProtegida>
            } 
          />
          <Route 
            path="/aluno/perfil" 
            element={
              <RotaProtegida perfilRequerido="aluno">
                <MeuPerfilAluno />
              </RotaProtegida>
            } 
          />
          <Route path="/aluno/conexoes" element={<RotaProtegida perfilRequerido="aluno"><MinhasConexoes /></RotaProtegida>} />
          <Route path="/aluno/metas" element={<RotaProtegida perfilRequerido="aluno"><MetasAluno /></RotaProtegida>} />
          <Route path="/aluno/medidas" element={<RotaProtegida perfilRequerido="aluno"><MedidasFotos /></RotaProtegida>} />

          {/* ==================== ROTAS DO PERSONAL ==================== */}
          <Route 
            path="/personal/dashboard" 
            element={
              <RotaProtegida perfilRequerido="personal">
                <DashboardPersonal />
              </RotaProtegida>
            } 
          />
          <Route 
            path="/personal/perfil" 
            element={
              <RotaProtegida perfilRequerido="personal">
                <GerenciarPerfilPersonal />
              </RotaProtegida>
            } 
          />

          {/* ==================== ROTAS DO NUTRI ==================== */}
          <Route 
            path="/nutri/dashboard" 
            element={
              <RotaProtegida perfilRequerido="nutri">
                <DashboardNutri />
              </RotaProtegida>
            } 
          />

          {/* ==================== ROTAS DA ACADEMIA ==================== */}
          <Route 
            path="/academia/dashboard" 
            element={
              <RotaProtegida perfilRequerido="academia">
                <DashboardAcademia />
              </RotaProtegida>
            } 
          />

          {/* Redirecionamento padrão para rotas inexistentes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
