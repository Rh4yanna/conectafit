import MensagemTemporaria from '../../components/MensagemTemporaria';
import { useEffect, useState } from 'react';
import { useTelaInicialPronta } from '../../components/AberturaAplicacao';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Utensils, Activity, Users } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../config/api';
import {FormRegistroAlimentar} from '../../components/alimentacao/DiarioAlimentar';

export default function DashboardAluno() {
  const navigate = useNavigate();
  const { temaEscuro } = useTheme();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [registro,setRegistro]=useState(null);
  useTelaInicialPronta(!!resumo || !!erro);
  useEffect(() => {
    const controller = new AbortController(); setErro('');
    const carregar = async () => {
      try { const r = await apiFetch('/aluno/resumo', { signal: controller.signal }); if (!r.ok) throw new Error(); setResumo(await r.json()); setErro(''); }
      catch { if (!controller.signal.aborted) setErro('Não foi possível atualizar seu painel.'); }
    };
    carregar(); window.addEventListener('focus', carregar);
    return () => { controller.abort(); window.removeEventListener('focus', carregar); };
  }, [tentativa]);
  const card = `rounded-2xl border p-5 ${temaEscuro ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`;
  const botao = 'rounded-xl bg-sky-600 text-white px-4 py-3 font-bold';
  const agenda = resumo?.treinos;
  const ativa = agenda?.sessao_ativa;
  return <main className={`px-5 lg:px-10 py-8 pb-28 space-y-6 ${temaEscuro ? 'text-white' : 'text-gray-900'}`}>
    <header><h1 className="text-2xl font-black">Visão geral</h1><p className="text-sm mt-1">Seu acompanhamento e os treinos programados para hoje.</p></header>
    {erro && <MensagemTemporaria as="p" role="alert" className="border border-red-500 rounded-xl p-4">{erro} <button className="acao-secundaria" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></MensagemTemporaria>}
    {!resumo && !erro && <p role="status">Carregando seu painel...</p>}
    {resumo && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${card} fit-stat`}><Dumbbell className="text-sky-500"/><p className="text-2xl font-bold mt-3">{resumo.treinos_atual} / {resumo.treinos_meta}</p><p className="text-sm">Treinos concluídos na semana</p></div>
        <div className={`${card} fit-stat`}><Utensils className="text-sky-500"/><p className="text-2xl font-bold mt-3">{resumo.refeicoes_atual} / {resumo.refeicoes_meta}</p><p className="text-sm">Refeições registradas na semana</p></div>
        <div className={`${card} fit-stat`}><Activity className="text-sky-500"/><p className="text-2xl font-bold mt-3">{resumo.agua_atual} L</p><p className="text-sm">Água registrada hoje</p><p className="text-xs">Meta diária: {resumo.agua_meta} L</p></div>
        <div className={`${card} fit-stat`}><Users className="text-amber-500"/><p className="text-2xl font-bold mt-3">{resumo.conexoes}</p><p className="text-sm">Conexões ativas</p></div>
      </div>
      {ativa && <section className={`${card} !border-sky-500`} aria-label="Sessão em andamento"><p className="text-sky-500 font-bold">{ativa.status === 'pausada' ? 'Você tem uma sessão pausada' : 'Você tem uma sessão em andamento'}</p><h2 className="text-xl font-bold my-2">{ativa.titulo}</h2><button className={botao} onClick={() => navigate('/aluno/treinos')}>Continuar sessão</button></section>}
      <section className="space-y-4" aria-label="Treinos de hoje"><h2 className="text-xl font-bold">Treinos de hoje</h2>
        {!agenda?.treinos_hoje?.length ? <div className={card}><p>Nenhum treino de musculação programado para hoje.</p>{resumo.orientacoes?.cardio&&<p className="text-sm mt-2">{resumo.orientacoes.cardio}</p>}<button className={`${botao} mt-3`} onClick={() => navigate('/aluno/treinos')}>Ver meus treinos</button></div> : <div className="grid md:grid-cols-2 gap-4">{agenda.treinos_hoje.map(t => <article className={card} key={t.id}><p className="text-sm font-bold text-sky-500">{new Intl.DateTimeFormat('pt-BR',{weekday:'long',timeZone:'America/Sao_Paulo'}).format(new Date())} · {t.concluido_hoje ? 'Concluído hoje' : 'Programado para hoje'}</p><h3 className="text-lg font-bold mt-2">{t.titulo}</h3><p className="text-sm my-2">{Array.isArray(t.exercicios) ? t.exercicios.length : 0} exercícios</p><ul className="text-sm space-y-1 mb-3">{(t.exercicios||[]).map((ex,i)=><li key={i}>{ex.nome} · {ex.repeticoes||`${ex.series} séries`}</li>)}</ul>{resumo.orientacoes?.cardio&&<p className="text-sm mb-3">{resumo.orientacoes.cardio}</p>}<button className={botao} onClick={() => navigate(t.concluido_hoje ? '/aluno/treinos' : `/aluno/treinos?ficha=${t.id}&iniciar=1`)}>{t.concluido_hoje ? 'Consultar histórico' : 'Iniciar treino'}</button></article>)}</div>}
      </section>
      <section className={card}><h2 className="text-lg font-bold">Alimentação de hoje</h2><div className="grid sm:grid-cols-2 gap-3 mt-3">{(resumo.refeicoes_hoje||[]).map(ref=><details key={ref.id} className="border border-neutral-500/25 rounded-xl p-3"><summary className="cursor-pointer font-semibold">{ref.nome} · {ref.registrada?'Registrada':'Não registrada'}</summary><p className="text-sm mt-2">{ref.detalhes}</p>{ref.orientacoes&&<p className="text-sm mt-1">{ref.orientacoes}</p>}{ref.substituicoes?.map((s,i)=><p key={i} className="text-sm text-sky-600">{s.original}: {s.escolhida} · quantidade e equivalência a validar</p>)}<button className={`${botao} mt-3`} onClick={()=>setRegistro({plano_id:ref.plano_id,plano_versao:ref.plano_versao,refeicao_id:ref.id,nome:ref.nome,contexto:{titulo:ref.plano_titulo,versao:ref.plano_versao,refeicao:ref}})}>Registrar refeição</button></details>)}</div>{!resumo.refeicoes_hoje?.length&&<p className="mt-2">Nenhuma refeição cadastrada.</p>}<button className={`${botao} mt-3`} onClick={() => navigate('/aluno/dietas')}>Ver alimentação</button></section>
      {registro&&<FormRegistroAlimentar registro={registro} onClose={()=>setRegistro(null)} onSalvo={()=>{setRegistro(null);setTentativa(n=>n+1);}}/>}
    </>}
  </main>;
}
