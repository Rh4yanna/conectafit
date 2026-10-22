import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, ArrowUpRight, Dumbbell, ShieldCheck, TrendingUp, Apple, Search, Users, Building2, Check } from 'lucide-react';
import logoEscura from '../assets/fescuro.png';
import './Landing.css';

const recursos = [
  { icon: Search, titulo: 'Encontre sua conexão', texto: 'Consulte perfis de profissionais e academias e encontre opções na sua cidade.' },
  { icon: Dumbbell, titulo: 'Treinos organizados', texto: 'Consulte sua ficha, registre as cargas utilizadas e acompanhe as sessões concluídas.' },
  { icon: Apple, titulo: 'Alimentação na rotina', texto: 'Acesse refeições, horários e orientações do seu plano alimentar em um só lugar.' },
  { icon: TrendingUp, titulo: 'Evolução com histórico', texto: 'Acompanhe metas, medidas e fotos para consultar seu progresso ao longo do tempo.' },
  { icon: ShieldCheck, titulo: 'Você controla o acesso', texto: 'Escolha quais medidas e fotos compartilhar com os profissionais conectados.' },
];
const perfis = [
  { icon: Users, titulo: 'Alunos', chamada: 'Sua rotina, mais organizada.', itens: ['Treinos e alimentação no mesmo lugar', 'Metas e registros de evolução', 'Organização pessoal, com ou sem profissional'] },
  { icon: Dumbbell, titulo: 'Personal trainers', chamada: 'Mais contexto para acompanhar.', itens: ['Fichas e programação de treinos', 'Histórico de sessões e cargas', 'Avaliações, retornos e agenda'] },
  { icon: Apple, titulo: 'Nutricionistas', chamada: 'Do plano ao acompanhamento.', itens: ['Anamnese e planos alimentares', 'Refeições e substituições autorizadas', 'Diário alimentar e consultas'] },
  { icon: Building2, titulo: 'Academias', chamada: 'Gestão conectada à sua operação.', itens: ['Alunos, matrículas e planos comerciais', 'Mensalidades e registros financeiros', 'Presença e acompanhamento de frequência'] },
];

export default function Landing() {
  const [avisoApp, setAvisoApp] = useState(false);
  const pagina = useRef(null);

  useEffect(() => {
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!('IntersectionObserver' in window) || preferencia.matches) return;
    // Content stays visible before observation and if animations are unavailable.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!preferencia.matches) entry.target.classList.add('landing-entered');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    pagina.current.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing" ref={pagina}>
      <header className="landing-header landing-container">
        <a className="landing-brand" href="#inicio" aria-label="ConectaFit — início">
          <img src={logoEscura} alt="" width="54" height="54" />
          <span>Conecta<span>FIT</span></span>
        </a>
        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#recursos">Recursos</a>
          <a href="#perfis">Para quem</a>
          <Link to="/login" className="landing-button landing-button-small">Entrar <ArrowUpRight aria-hidden="true" size={17} /></Link>
        </nav>
      </header>
      <main id="conteudo-principal" tabIndex={-1}>
        <section id="inicio" className="landing-hero landing-container" aria-labelledby="landing-title">
          <div className="landing-hero-copy" data-reveal>
            <p className="landing-eyebrow"><span /> Treino, alimentação e conexões</p>
            <h1 id="landing-title">Conecte seu treino ao seu <em>resultado.</em></h1>
            <p className="landing-lead">Sua rotina merece estar conectada. Reúna treinos, alimentação e evolução com os profissionais que acompanham você.</p>
            <div className="landing-actions">
              <Link to="/login" className="landing-button">Acesse a versão web <ArrowUpRight size={19} aria-hidden="true" /></Link>
              <button type="button" className="landing-button landing-button-secondary" onClick={() => setAvisoApp(true)} aria-describedby="landing-app-status"><Smartphone size={19} aria-hidden="true" /> Baixar app</button>
            </div>
            <div id="landing-app-status" role="status" className="landing-app-status">{avisoApp ? 'Em breve na App Store e no Google Play' : ''}</div>
            <p className="landing-web-note">A plataforma já pode ser acessada pelo navegador.</p>
          </div>
          <div className="landing-hero-art" aria-hidden="true">
            <img src={logoEscura} alt="" width="2000" height="2000" fetchPriority="high" />
            <div className="landing-art-label landing-art-label-top"><Dumbbell size={20} /> Seu treino</div>
            <div className="landing-art-label landing-art-label-bottom"><Apple size={20} /> Sua alimentação</div>
            <p>Uma rotina. Mais conexões.</p>
          </div>
        </section>
        <section id="recursos" className="landing-section landing-container" aria-labelledby="recursos-title" data-reveal>
          <div className="landing-section-heading">
            <div><p className="landing-eyebrow">Tudo mais próximo</p><h2 id="recursos-title">Menos informação espalhada.<br />Mais clareza para sua rotina.</h2></div>
            <p>Consulte o que foi planejado, registre o que foi realizado e mantenha seu histórico organizado.</p>
          </div>
          <div className="landing-resources">
            {recursos.map(({ icon: Icon, titulo, texto }) => <article className="landing-card" key={titulo}><span className="landing-icon"><Icon size={23} aria-hidden="true" /></span><h3>{titulo}</h3><p>{texto}</p></article>)}
          </div>
        </section>
        <section id="perfis" className="landing-section landing-profiles-section" aria-labelledby="perfis-title">
          <div className="landing-container" data-reveal>
            <div className="landing-section-heading"><div><p className="landing-eyebrow">Cada perfil, seu espaço</p><h2 id="perfis-title">Uma plataforma.<br />Diferentes formas de cuidar.</h2></div><p>Recursos próprios para quem treina, orienta e gerencia, com informações organizadas para cada papel.</p></div>
            <div className="landing-profiles">{perfis.map(({ icon: Icon, titulo, chamada, itens }) => <article className="landing-profile" key={titulo}><Icon size={26} aria-hidden="true" /><h3>{titulo}</h3><p>{chamada}</p><ul>{itens.map(item => <li key={item}><Check size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul></article>)}</div>
          </div>
        </section>
        <section className="landing-container landing-closing" aria-labelledby="closing-title" data-reveal>
          <div><p className="landing-eyebrow">Seu próximo passo</p><h2 id="closing-title">Conecte o cuidado à sua rotina.</h2><p>Acesse seu espaço e continue de onde parou.</p></div>
          <Link to="/login" className="landing-button">Acessar ConectaFit <ArrowUpRight size={19} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className="landing-footer landing-container"><span className="landing-footer-brand">Conecta<span>FIT</span></span><p>ConectaFit desenvolvido por Rhayanna Borges Tonete.</p></footer>
    </div>
  );
}
