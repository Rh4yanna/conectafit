import ProgressoAluno from '../../components/aluno/ProgressoAluno';
import { Trash2 } from 'lucide-react';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import ModalAlimentacao from '../../components/alimentacao/ModalAlimentacao';
import MensagensTreino from '../../components/personal/MensagensTreino';
import DemonstracaoPropria from '../../components/personal/DemonstracaoPropria';
/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../config/api';
import { useTheme } from '../../context/ThemeContext';
import DemonstracaoExercicio from '../../components/DemonstracaoExercicio';

const aberta = s => s && ['em_andamento', 'pausada'].includes(s.status);
const rotulos = { em_andamento: 'Em andamento', pausada: 'Pausada', concluida: 'Concluída', incompleta: 'Encerrada incompleta' };
const data = v => new Date(v).toLocaleString('pt-BR');
const tempo = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const exerciciosFicha = ficha => {
  try { const lista = typeof ficha?.exercicios === 'string' ? JSON.parse(ficha.exercicios) : ficha?.exercicios; return Array.isArray(lista) ? lista : []; }
  catch { return []; }
};
const resumo = s => {
  const series = s.exercicios.flatMap(e => e.series);
  return `${series.filter(e => e.concluida).length} de ${series.length} séries`;
};
async function requisicao(path, options) {
  let r;
  try { r = await apiFetch(`/sessoes-treino${path}`, { ...options, signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error('Não foi possível conectar ao servidor. Seus registros na tela foram mantidos. Tente salvar novamente.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.message || 'Não foi possível acessar os treinos. Tente novamente.'), { status: r.status });
  return d;
}
function chave(s) { return `conectafit:sessao:${s.aluno_id}:${s.id}`; }

// O cronômetro usa um instante final, evitando desvio quando a aba fica em segundo plano.
function Descanso({ desabilitado = false }) {
  const [duracao, setDuracao] = useState(60);
  const [restante, setRestante] = useState(60);
  const [fim, setFim] = useState(null);
  useEffect(() => {
    if (!fim) return;
    const tick = () => { const n = Math.max(0, Math.ceil((fim - Date.now()) / 1000)); setRestante(n); if (!n) setFim(null); };
    tick(); const id = setInterval(tick, 250); return () => clearInterval(id);
  }, [fim]);
  return <fieldset disabled={desabilitado} className="border border-neutral-500/30 rounded-xl p-3 flex flex-wrap items-center gap-3 disabled:opacity-60 min-w-0">
    <label>Descanso <select aria-label="Duração do descanso" className="bg-transparent border rounded-lg p-2 ml-2" value={duracao} onChange={e => { const n = Number(e.target.value); setDuracao(n); setRestante(n); setFim(null); }}>{[30, 45, 60, 90, 120, 180].map(n => <option className="text-black" key={n} value={n}>{n} s</option>)}</select></label>
    <strong className="text-2xl tabular-nums" aria-label="Tempo restante">{tempo(restante)}</strong>
    <button type="button" className="border rounded-lg px-3 py-2" onClick={() => fim ? setFim(null) : setFim(Date.now() + (restante || duracao) * 1000)}>{fim ? 'Pausar descanso' : 'Iniciar descanso'}</button>
    <button type="button" className="acao-secundaria" onClick={() => { setFim(null); setRestante(duracao); }}>Reiniciar</button>
    {restante === 0 && <span role="status">Descanso concluído.</span>}
  </fieldset>;
}

export default function SessoesTreino({ ficha, limparFicha, onAtualizada, aba='sessao' }) {
  const { temaEscuro } = useTheme();
  const [sessao, setSessao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [limiteHistorico, setLimiteHistorico] = useState(3);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [todos, setTodos] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const travaExclusao = useRef(false);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const travaHistorico = useRef(false);
  const [mais, setMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const leitura = useRef(0);
  const carregou = useRef(false);
  const feedback = useRef(null);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmar, setConfirmar] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const [cardAberto, setCardAberto] = useState(false);
  useEffect(() => { if (ficha) setCardAberto(true); }, [ficha]);
  const fecharCard = () => { setCardAberto(false); limparFicha(); };
  const superficie = temaEscuro ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-300';
  const campo = `w-full min-w-0 border rounded-lg p-2 ${temaEscuro ? 'bg-neutral-950 border-neutral-600' : 'bg-white border-gray-400'}`;
  const botao = 'rounded-xl px-4 py-3 font-bold bg-sky-600 text-white disabled:opacity-50';

  const carregar = useCallback(async (offset = 0) => {
    const pedido = ++leitura.current;
    setCarregando(true); setErro('');
    try {
      const d = await requisicao(`?offset=${offset}`);
      if (pedido !== leitura.current) return;
      carregou.current = true;
      setSessao(d.ativa); if (d.ativa) setCardAberto(true); setHistorico(d.historico); setLimiteHistorico(3); setTotalHistorico(d.total ?? d.historico.length); setMais(d.temMais); setSujo(false); setRascunho(null);
      if (d.ativa) {
        try {
          const local = JSON.parse(localStorage.getItem(chave(d.ativa)) || 'null');
          if (local && local.versao === d.ativa.versao && local.id === d.ativa.id) setRascunho(local);
          else if (local) setAviso('Há um rascunho antigo neste aparelho. Foi mantida a versão mais recente do servidor.');
        } catch { setAviso('Não foi possível recuperar o rascunho deste aparelho. Os dados salvos no servidor foram carregados.'); }
      }
    } catch (e) { if (pedido === leitura.current) setErro(e.message); }
    finally { if (pedido === leitura.current) setCarregando(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { const id = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const impedir = e => { if (sujo) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', impedir); return () => window.removeEventListener('beforeunload', impedir);
  }, [sujo]);

  const alterar = proxima => {
    setSessao(proxima); setSujo(true); setAviso('Alterações ainda não salvas no servidor.');
    try { localStorage.setItem(chave(proxima), JSON.stringify(proxima)); }
    catch { setAviso('Não foi possível guardar o rascunho neste aparelho. Salve antes de sair.'); }
  };
  const iniciar = useCallback(async () => {
    if (trava.current || !ficha || sessao || carregando || !carregou.current) return;
    trava.current = true; setOcupado(true); setErro('');
    try { const d = await requisicao('', { method: 'POST', body: JSON.stringify({ treino_id: ficha.id }) }); setSessao(d.sessao); setSujo(false); limparFicha(); setAviso('Treino aberto. Informe o peso e marque cada exercício realizado.'); }
    catch (e) { setErro(e.message); if (e.status === 409) await carregar(); }
    finally { trava.current = false; setOcupado(false); }
  }, [ficha, limparFicha, carregar, sessao, carregando]);
  useEffect(() => { if (confirmar) feedback.current?.focus(); }, [confirmar]);
  const salvar = async (status = sessao.status) => {
    if (trava.current) return;
    if (['concluida', 'incompleta'].includes(status) && !sessao.observacoes.trim()) {
      setErro('Conte como foi o treino antes de finalizar.'); feedback.current?.focus(); return;
    }
    trava.current = true; setOcupado(true); setErro('');
    try {
      const d = await requisicao(`/${sessao.id}`, { method: 'PUT', body: JSON.stringify({ versao: sessao.versao, exercicios: sessao.exercicios, observacoes: sessao.observacoes, dificuldade: sessao.dificuldade, satisfacao: sessao.satisfacao, sensacao_durante: sessao.sensacao_durante, sensacao_apos: sessao.sensacao_apos, status }) });
      try { localStorage.removeItem(chave(sessao)); } catch { /* Salvamento no servidor já confirmado. */ }
      setSujo(false); setRascunho(null); setConfirmar(null);
      onAtualizada?.();
      if (aberta(d.sessao)) { setSessao(d.sessao); setAviso(`Salvo às ${new Date().toLocaleTimeString('pt-BR')}.`); }
      else { setCardAberto(false); setDetalhe(d.sessao); setSessao(null); limparFicha(); await carregar(); setAviso('Sessão encerrada e registrada no histórico.'); }
    } catch (e) { setErro(e.message); }
    finally { trava.current = false; setOcupado(false); }
  };
  const atualizarSerie = (i, j, valor) => alterar({ ...sessao, exercicios: sessao.exercicios.map((ex, ei) => ei === i ? { ...ex, series: ex.series.map((s, si) => si === j ? { ...s, ...valor } : s) } : ex) });
  const atualizarExercicio = (i, valor) => alterar({ ...sessao, exercicios: sessao.exercicios.map((ex, ei) => ei === i ? { ...ex, series: ex.series.map(s => ({ ...s, ...valor })) } : ex) });
  const verMais = async () => {
    if (travaHistorico.current) return;
    if (historico.length >= limiteHistorico + 3 || !mais) {
      setLimiteHistorico(limite => limite + 3);
      return;
    }
    travaHistorico.current = true; setCarregandoMais(true); setErro('');
    const versaoLeitura = leitura.current;
    try {
      const d = await requisicao(`?offset=${historico.length}`);
      if (versaoLeitura !== leitura.current) return;
      setHistorico(atuais => [...atuais, ...d.historico.filter(s => !atuais.some(a => a.id === s.id))]);
      setMais(d.temMais);
      setLimiteHistorico(limite => limite + 3);
    } catch (e) { if (versaoLeitura === leitura.current) setErro(e.message); }
    finally { travaHistorico.current = false; setCarregandoMais(false); }
  };
  const excluirHistorico = async () => {
    if (travaExclusao.current || (!todos && !selecionados.length)) return;
    const quantidade = todos ? totalHistorico : selecionados.length;
    if (!window.confirm(`Excluir ${quantidade} treino(s) do histórico${todos ? ', incluindo os ocultos em Ver mais' : ''}? Os registros e sua contribuição para a evolução serão removidos. Esta ação não pode ser desfeita.`)) return;
    travaExclusao.current = true; setExcluindo(true); setErro('');
    ++leitura.current;
    try {
      await requisicao('/historico', {method:'DELETE', body:JSON.stringify(todos ? {todos:true} : {ids:selecionados})});
      setDetalhe(null); setSelecionados([]); setTodos(false); setSelecionando(false);
      setHistorico([]); setMais(false); setTotalHistorico(0);
      onAtualizada?.();
      const d = await requisicao('?offset=0');
      setHistorico(d.historico); setLimiteHistorico(3); setMais(d.temMais); setTotalHistorico(d.total ?? d.historico.length);
      setAviso('Histórico selecionado excluído com sucesso.');
    } catch (e) { setErro(e.message); }
    finally { travaExclusao.current = false; setExcluindo(false); }
  };
  const recarregar = () => { if (!sujo || window.confirm('Carregar a versão salva no servidor? As alterações locais não serão aplicadas.')) { setConfirmar(null); carregar(); } };
  const duracao = sessao ? sessao.segundos_ativos + (sessao.status === 'em_andamento' ? Math.max(0, Math.floor((agora - new Date(sessao.retomada_em).getTime()) / 1000)) : 0) : 0;

  const mensagens = <>
    {erro && <MensagemTemporaria as="div" role="alert" className="border border-red-500 rounded-xl p-4"><p>{erro}</p><button disabled={ocupado} className="acao-secundaria mt-2" onClick={recarregar}>Recarregar dados salvos</button></MensagemTemporaria>}
    {aviso && <MensagemTemporaria as="p" role="status" className="text-sm border border-sky-500/40 rounded-xl p-3">{aviso}</MensagemTemporaria>}
  </>;
  const painelTreino = (ficha || sessao) && <div className="space-y-5 min-w-0" aria-label="Ficha e execução do treino">
      {mensagens}
      {ficha && !sessao && <>
        <button className={botao} disabled={ocupado || !carregou.current || !exerciciosFicha(ficha).length} onClick={iniciar}>{ocupado ? 'Iniciando treino...' : 'Iniciar treino'}</button>
        <ol className="space-y-3" aria-label="Exercícios do treino selecionado">{exerciciosFicha(ficha).map((ex, i) => <li key={i} className="border border-neutral-500/30 rounded-xl p-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-bold text-lg break-words">{i + 1}. {ex.nome}</h3>
            <p className="text-sm break-words">
              {ex.series ? `${ex.series} ${Number(ex.series) === 1 ? 'série' : 'séries'}` : 'Séries não informadas'}
              {ex.repeticoes ? ` de ${String(ex.repeticoes).replace(/^(\d+)\s*[-–]\s*(\d+)$/, '$1 a $2')} repetições` : ' · Repetições não informadas'}
            </p>
          </div>
        </li>)}</ol>
        {!exerciciosFicha(ficha).length && <p>Esta ficha não tem exercícios disponíveis.</p>}
      </>}
      {ficha && sessao && <p className="border rounded-xl p-3">Você já tem uma sessão aberta: <strong>{sessao.titulo}</strong>. Continue abaixo ou encerre antes de iniciar outra ficha. <button className="acao-secundaria" onClick={limparFicha}>Entendi</button></p>}
      {sessao && <>
        {rascunho && <div className="border border-amber-500 rounded-xl p-3 space-y-2"><p>Encontramos alterações não enviadas deste aparelho.</p><button className="acao-secundaria mr-4" onClick={() => { alterar(rascunho); setRascunho(null); }}>Recuperar rascunho</button><button className="acao-secundaria" onClick={() => { try { localStorage.removeItem(chave(sessao)); } catch { /* opcional */ } setRascunho(null); }}>Usar dados salvos</button></div>}
        <fieldset disabled={ocupado || Boolean(rascunho)} className="space-y-5 disabled:opacity-70">
          <ProgressoAluno label="Progresso do treino" valor={sessao.exercicios.reduce((n,e)=>n+e.series.filter(s=>s.concluida).length,0)} total={sessao.exercicios.reduce((n,e)=>n+e.series.length,0)}/><Descanso desabilitado={sessao.status === 'pausada'} />
          {sessao.status === 'pausada' && <button className={botao} onClick={() => salvar('em_andamento')}>Retomar sessão</button>}
          {sessao.status === 'em_andamento' && <div className="flex flex-wrap gap-3"><button className="acao-secundaria" onClick={()=>salvar('pausada')}>Pausar sessão</button><button className="acao-secundaria" disabled={!sujo} onClick={()=>salvar()}>Salvar progresso</button></div>}
          {sessao.status === 'pausada' && <p>Sessão pausada. Retome para registrar as próximas séries.</p>}
          <fieldset disabled={sessao.status === 'pausada'} className="space-y-4">
            <ol className="space-y-3" aria-label="Exercícios do treino">{sessao.exercicios.map((ex, i) => <li key={i} className="border border-neutral-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words"><h3 className="font-bold text-lg">{i + 1}. {ex.nome}</h3><p className="text-sm">Planejado: {ex.prescricao.series} séries · {ex.prescricao.repeticoes || 'Repetições não informadas'} · carga: {ex.prescricao.carga || 'Não informada'}</p></div>
                <label className="flex shrink-0 items-center gap-2 min-h-11"><input className="h-5 w-5" aria-label={`${ex.nome}, exercício concluído`} aria-controls={`series-${sessao.id}-${i}`} type="checkbox" checked={ex.series.every(s => s.concluida)} onChange={e => atualizarExercicio(i, { concluida: e.target.checked })}/>Feito</label>
              </div>
              <div id={`series-${sessao.id}-${i}`} hidden={ex.series.every(s => s.concluida)} className="space-y-3">
              {ex.series.map((s, j) => <div key={j} className="grid grid-cols-2 sm:grid-cols-[5rem_1fr_1fr] gap-3 items-end border-t border-neutral-500/20 pt-3"><strong className="col-span-2 sm:col-span-1 self-center">Série {j + 1}</strong>
                <label className="text-sm min-w-0">Repetições<input aria-label={`${ex.nome}, série ${j + 1}, repetições`} type="number" min="0" max="1000" step="1" className={campo} value={s.repeticoes ?? ''} onChange={e => atualizarSerie(i, j, { repeticoes: e.target.value === '' ? null : Number(e.target.value) })}/></label>
                <label className="text-sm min-w-0">Carga (kg)<input aria-label={`${ex.nome}, série ${j + 1}, carga`} type="number" min="0" max="2000" step="0.1" className={campo} value={s.carga ?? ''} onChange={e => atualizarSerie(i, j, { carga: e.target.value === '' ? null : Number(e.target.value) })}/></label>
                <label className="col-span-2 sm:col-span-3 flex gap-3 items-center min-h-11"><input type="checkbox" checked={s.concluida} aria-label={`${ex.nome}, série ${j+1}, concluída`} onChange={e=>atualizarSerie(i,j,{concluida:e.target.checked})}/>Concluir série {j+1}</label>{ex.anterior?.series[j]?.concluida && s.carga !== null && <p className="col-span-2 sm:col-span-3 text-xs">Diferença para a série anterior: {Math.round((s.carga - ex.anterior.series[j].carga) * 100) / 100} kg. Considere também as repetições e a orientação do profissional.</p>}
              </div>)}
              </div>
              <div className="space-y-3 pt-2">
              {ex.prescricao.descanso_segundos!=null&&<p className="text-sm">Descanso entre séries: {ex.prescricao.descanso_segundos} segundos</p>}
              {ex.prescricao.orientacoes && <p>{ex.prescricao.orientacoes}</p>}
              {(ex.variacao||ex.equipamento)&&<p className="text-sm">{[ex.variacao,ex.equipamento].filter(Boolean).join(' • ')}</p>}{ex.demonstracao_propria?<DemonstracaoPropria key={ex.demonstracao_propria.id} dados={ex.demonstracao_propria}/>:ex.demonstracao?.videos?.length ? <DemonstracaoExercicio dados={ex.demonstracao}/> : <p className="text-sm opacity-60">Demonstração indisponível</p>}
              {ex.anterior && <div className="border border-sky-500/30 bg-sky-500/5 rounded-lg p-3 text-sm"><strong>Sessão anterior: {data(ex.anterior.data)}</strong><p>Carga máxima: {ex.anterior.carga_maxima} kg · Volume: {ex.anterior.volume ?? 'Não calculado'} kg × rep.</p><ul>{ex.anterior.series.map((s, n) => <li key={n}>Série {n + 1}: {s.carga ?? '—'} kg × {s.repeticoes ?? '—'} repetições</li>)}</ul></div>}
              </div>
            </li>)}</ol>
          </fieldset>
          {!confirmar && <button className={botao} onClick={() => setConfirmar(true)}>Finalizar treino</button>}
          {confirmar && <div className="border border-sky-500 rounded-xl p-4 space-y-3" role="group" aria-label="Confirmar encerramento">
            <label className="block font-bold">Como foi o treino?<textarea ref={feedback} required aria-describedby="feedback-treino-ajuda" className={`${campo} mt-2 font-normal`} maxLength={2000} rows={3} value={sessao.observacoes} onChange={e => alterar({ ...sessao, observacoes: e.target.value })}/></label>
            <div className="grid sm:grid-cols-2 gap-3">{[['dificuldade','Dificuldade (1 = muito leve; 5 = muito difícil)'],['satisfacao','Satisfação (1 = muito baixa; 5 = muito alta)']].map(([k,l])=><label key={k}>{l}<select className={campo} value={sessao[k]??''} onChange={e=>alterar({...sessao,[k]:e.target.value?Number(e.target.value):null})}><option value="">Opcional</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>)}</div>
            {[['sensacao_durante','Como se sentiu durante o treino?'],['sensacao_apos','Como se sentiu após o treino?']].map(([k,l])=><label className="block" key={k}>{l}<textarea className={campo} maxLength={1000} rows={2} placeholder="Opcional" value={sessao[k]||''} onChange={e=>alterar({...sessao,[k]:e.target.value})}/></label>)}
            <p id="feedback-treino-ajuda" className="text-sm">Preenchimento obrigatório. Conte como se sentiu ou se teve alguma dificuldade.</p>
            <p>{resumo(sessao)}. {sessao.exercicios.every(ex => ex.series.every(s => s.concluida)) ? 'O treino será registrado como concluído.' : 'Há exercícios ou séries não concluídos. O treino será registrado como incompleto.'} Depois de finalizar, os registros não poderão ser editados.</p>
            <div className="flex flex-wrap gap-3"><button className={botao} disabled={!sessao.observacoes.trim()} onClick={() => salvar(sessao.exercicios.every(ex => ex.series.every(s => s.concluida)) ? 'concluida' : 'incompleta')}>Confirmar finalização</button><button onClick={() => setConfirmar(null)}>Continuar registrando</button></div>
          </div>}
        </fieldset>
        <MensagensTreino key={`ativa-${sessao.id}`} sessao={sessao}/><p className="text-sm">{ocupado ? 'Salvando...' : sujo ? 'Há alterações não salvas no servidor.' : `Último registro salvo: ${data(sessao.atualizada_em)}`}</p>
      </>}
      </div>;
  return <section className="space-y-5" aria-label="Execução e histórico de treinos">
    {(!painelTreino || !cardAberto) && mensagens}
    {carregando ? <p role="status">Carregando sessões...</p> : <>
      {painelTreino && cardAberto && <ModalAlimentacao titulo={sessao?.titulo || ficha?.titulo || 'Seu treino'} subtitulo={sessao && <><span className="block text-sm">Tempo total do treino: <strong aria-label="Tempo total do treino" className="tabular-nums">{tempo(duracao)}</strong></span>{sessao && <span className="block text-xs mt-1"><span>{rotulos[sessao.status]}</span> · {resumo(sessao)} · Tempo ativo, sem as pausas.</span>}</>} ocupado={ocupado} onClose={fecharCard} desfocarFundo>{painelTreino}</ModalAlimentacao>}
      {sessao && !cardAberto && <div className={`border rounded-2xl p-4 space-y-3 ${superficie}`}><p><strong>{sessao.titulo}</strong> · {rotulos[sessao.status]}</p><p className="text-sm">Fechar o card não pausa o treino. Seus registros continuam disponíveis nesta página.</p><button className={botao} onClick={() => setCardAberto(true)}>Continuar treino</button></div>}
      <div hidden={aba!=='historico'} className={`border rounded-2xl p-5 space-y-4 ${superficie}`}><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Histórico de treinos</h2><button type="button" aria-label="Selecionar treinos para excluir" aria-pressed={selecionando} disabled={!historico.length || excluindo || carregandoMais} onClick={() => {setSelecionando(v => !v); setSelecionados([]); setTodos(false);}} className="acao-secundaria text-red-500"><Trash2 size={20}/></button></div>
        {selecionando && <div className="border border-red-500/30 rounded-xl p-3 space-y-3"><label className="flex items-center gap-2"><input type="checkbox" disabled={excluindo} checked={todos} onChange={e => {setTodos(e.target.checked); setSelecionados(e.target.checked ? historico.map(s => s.id) : []);}}/>Selecionar todos ({totalHistorico}), incluindo os mais antigos</label><div className="flex flex-wrap gap-3"><button className={botao} disabled={excluindo || (!todos && !selecionados.length)} onClick={excluirHistorico}>{excluindo ? 'Excluindo...' : `Excluir selecionados (${todos ? totalHistorico : selecionados.length})`}</button><button className="acao-secundaria" disabled={excluindo} onClick={() => {setSelecionando(false);setSelecionados([]);setTodos(false);}}>Cancelar</button></div></div>}
        <p className="text-sm">Treinos concluídos e incompletos, preservados mesmo quando a ficha é alterada ou excluída.</p>
        {!historico.length ? <p>Nenhum treino registrado nesta página.</p> : historico.slice(0, limiteHistorico).map(s => <div key={s.id} className="flex items-start gap-3">{selecionando && <input className="mt-5 h-5 w-5 shrink-0" type="checkbox" aria-label={`Selecionar ${s.titulo}, ${data(s.iniciada_em)}`} disabled={excluindo} checked={todos || selecionados.includes(s.id)} onChange={e => {setTodos(false);setSelecionados(atuais => e.target.checked ? [...atuais,s.id] : (todos ? historico.map(item => item.id) : atuais).filter(id => id !== s.id));}}/>}<button className="w-full text-left border border-neutral-500/30 rounded-xl p-4 hover:border-sky-500" onClick={() => setDetalhe(detalhe?.id === s.id ? null : s)}><strong>{s.titulo}</strong><span className="block text-sm">{data(s.iniciada_em)} · {rotulos[s.status]} · {resumo(s)} · {tempo(s.segundos_ativos)} de tempo ativo</span><span className="text-sky-500 text-sm">Ver registros</span></button></div>)}
        {(mais || historico.length > limiteHistorico) && <button className="botao-paginacao" disabled={carregandoMais || ocupado || excluindo} onClick={verMais}>{carregandoMais ? 'Carregando...' : 'Ver mais'}</button>}
        {limiteHistorico > 3 && historico.length > 3 && <button className="botao-paginacao" disabled={carregandoMais || ocupado || excluindo} onClick={() => { setLimiteHistorico(3); setDetalhe(null); }}>Ver menos</button>}
        {detalhe && <article className="border border-sky-500 rounded-xl p-4 space-y-3"><div className="flex justify-between gap-3"><h3 className="font-bold">{detalhe.titulo} · {rotulos[detalhe.status]}</h3><button className="acao-secundaria" onClick={() => setDetalhe(null)}>Fechar detalhes</button></div><p>{data(detalhe.iniciada_em)} · {resumo(detalhe)} · {tempo(detalhe.segundos_ativos)} de tempo ativo</p>{detalhe.exercicios.map((ex, i) => <div key={i}><h4 className="font-bold">{ex.nome}</h4>{(ex.variacao||ex.equipamento)&&<p className="text-sm">{[ex.variacao,ex.equipamento].filter(Boolean).join(' • ')}</p>}{ex.demonstracao_propria?<DemonstracaoPropria key={ex.demonstracao_propria.id} dados={ex.demonstracao_propria}/>:<DemonstracaoExercicio dados={ex.demonstracao}/>}<p className="text-sm">Planejado: {ex.prescricao.series} × {ex.prescricao.repeticoes} · {ex.prescricao.carga || 'Carga não informada'}</p><p>Descanso prescrito: {ex.prescricao.descanso_segundos==null?'Não informado':`${ex.prescricao.descanso_segundos} segundos`}</p><ul className="list-disc pl-5">{ex.series.map((s, j) => <li key={j}>Série {j + 1}: {s.repeticoes ?? '—'} repetições · {s.carga ?? '—'} kg · {s.concluida ? 'Feita' : 'Não concluída'}</li>)}</ul>{ex.observacoes && <p className="whitespace-pre-wrap">Relato: {ex.observacoes}</p>}</div>)}{detalhe.observacoes && <p className="whitespace-pre-wrap">Relato da sessão: {detalhe.observacoes}</p>}{detalhe.dificuldade!=null&&<p>Dificuldade: {detalhe.dificuldade}/5</p>}{detalhe.satisfacao!=null&&<p>Satisfação: {detalhe.satisfacao}/5</p>}{detalhe.sensacao_durante&&<p>Durante: {detalhe.sensacao_durante}</p>}{detalhe.sensacao_apos&&<p>Após: {detalhe.sensacao_apos}</p>}<MensagensTreino key={`detalhe-${detalhe.id}`} sessao={detalhe}/></article>}
      </div>
    </>}
    <div hidden={aba!=='retornos'}><MensagensTreino/></div>
  </section>;
}
