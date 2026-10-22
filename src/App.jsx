import MensagemTemporaria from './components/MensagemTemporaria';
import FeedbackOperacoes from './components/FeedbackOperacoes';
import AberturaAplicacao, {useTelaInicialPronta} from './components/AberturaAplicacao';
import ConvitePersonal from './pages/ConvitePersonal';
import ExperienciaCompartilhada,{ProtecaoTela} from './components/ExperienciaCompartilhada';
import ConviteAcademia from './pages/academia/ConviteAcademia';
import RotinaAluno from './pages/aluno/RotinaAluno';
import AlunoLayout from './pages/aluno/AlunoLayout';
import {useState,useEffect} from 'react';
import {apiFetch} from './config/api';
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

// Telas do Aluno
import BuscarServicos from './pages/aluno/BuscarServicos';
import MeusTreinos from './pages/aluno/MeusTreinos';
import MinhaDieta from './pages/aluno/MinhaDieta';
import MeuPerfilAluno from './pages/aluno/MeuPerfil';
import MinhasConexoes from './pages/aluno/MinhasConexoes';
import MetasAluno from './pages/aluno/MetasAluno';
import MedidasFotos from './pages/aluno/MedidasFotos';

// O servidor confirma a sessao antes de montar telas com dados pessoais.
// eslint-disable-next-line react/prop-types
function RotaProtegida({ children, perfilRequerido }) {
  const [usuario,setUsuario]=useState(null),[erro,setErro]=useState(''),[tentativa,setTentativa]=useState(0);
  useTelaInicialPronta(!!erro || usuario === false);
  useEffect(()=>{
    let ativa=true,contaId;
    setErro('');setUsuario(null);
    apiFetch('/usuario/me').then(async r=>{
      if(r.status===401){if(ativa)setUsuario(false);return;}
      if(!r.ok)throw new Error('Não foi possível verificar sua sessão. Tente novamente.');
      const u=await r.json();contaId=u.id;if(ativa){localStorage.setItem('usuario',JSON.stringify(u));setUsuario(u);}
    }).catch(e=>{if(ativa)setErro(e.message);});
    const saiu=()=>{ativa=false;setUsuario(false);};
    const mudou=e=>{if(e.key===null||e.key==='usuario'&&!e.newValue){saiu();return;}if(e.key==='usuario'&&contaId){try{if(String(JSON.parse(e.newValue)?.id)!==String(contaId))saiu();}catch{saiu();}}};
    window.addEventListener('conectafit-logout',saiu);window.addEventListener('storage',mudou);
    return()=>{ativa=false;window.removeEventListener('conectafit-logout',saiu);window.removeEventListener('storage',mudou);};
  },[tentativa]);
  if(erro)return <main className="p-8"><MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria><button className="underline mt-4" onClick={()=>setTentativa(t=>t+1)}>Tentar novamente</button></main>;
  if(usuario===false)return <Navigate to="/login" replace/>;
  if(!usuario)return <main className="p-8" role="status">Verificando sessão...</main>;
  if(perfilRequerido&&usuario.tipo_usuario!==perfilRequerido)return <Navigate to="/login" replace/>;
  return <div className="app-visual">{perfilRequerido==='aluno'?<AlunoLayout>{children}</AlunoLayout>:children}</div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AberturaAplicacao>
        <ExperienciaCompartilhada/>
        <FeedbackOperacoes/>
        <div id="conteudo-principal" tabIndex={-1}><ProtecaoTela><Routes>
          <Route path="/convite/academia/:token" element={<ConviteAcademia/>}/>
          <Route path="/academia/equipe" element={<RotaProtegida><DashboardAcademia equipe/></RotaProtegida>}/>
          {/* Rotas Públicas */}
          <Route path="/" element={<Landing />} /><Route path="/convite/personal/:token" element={<ConvitePersonal/>}/><Route path="/convite/nutricionista/:token" element={<ConvitePersonal/>}/><Route path="/convite/:token" element={<ConvitePersonal/>}/>
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
          <Route path="/aluno/rotina" element={<RotaProtegida perfilRequerido="aluno"><RotinaAluno /></RotaProtegida>} />
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
                <Navigate to="/personal/dashboard?aba=perfil" replace />
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

          <Route path="/academia/alunos" element={<RotaProtegida perfilRequerido="academia"><DashboardAcademia tela="alunos" /></RotaProtegida>} />
          <Route path="/academia/pagamentos" element={<RotaProtegida perfilRequerido="academia"><DashboardAcademia tela="pagamentos" /></RotaProtegida>} />
          <Route path="/academia/perfil" element={<RotaProtegida perfilRequerido="academia"><DashboardAcademia tela="perfil" /></RotaProtegida>} />

          {/* Redirecionamento padrão para rotas inexistentes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></ProtecaoTela></div>
        </AberturaAplicacao>
      </BrowserRouter>
    </ThemeProvider>
  );
}
