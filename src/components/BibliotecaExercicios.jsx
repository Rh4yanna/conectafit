import MensagemTemporaria from './MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import DemonstracaoExercicio from './DemonstracaoExercicio';

export default function BibliotecaExercicios({ onSelecionar, onFechar }) {
  const { temaEscuro } = useTheme();
  const dialog = useRef(null);
  const [filtros, setFiltros] = useState({ busca: '', grupo: '', equipamento: '', video: true, idioma: '' });
  const [offset, setOffset] = useState(0);
  const [dados, setDados] = useState({ resultados: [], grupos: [], equipamentos: [], total: 0 });
  const [erro, setErro] = useState(''); const [carregando, setCarregando] = useState(true); const [tentativa, setTentativa] = useState(0);
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setCarregando(true); setErro('');
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ ...filtros, offset });
        const r = await apiFetch(`/exercicios?${query}`, { signal: controller.signal });
        if (!r.ok) throw new Error('Não foi possível carregar a biblioteca.');
        const d = await r.json(); if (!controller.signal.aborted) setDados(d);
      } catch (e) { if (!controller.signal.aborted) setErro(e.message); }
      finally { if (!controller.signal.aborted) setCarregando(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filtros, offset, tentativa]);
  const mudar = (nome, valor) => { setFiltros(f => ({ ...f, [nome]: valor })); setOffset(0); };
  const campo = `border rounded-lg p-3 w-full ${temaEscuro ? 'bg-neutral-950 border-neutral-600' : 'bg-white border-gray-400'}`;
  return <dialog ref={dialog} onCancel={onFechar} className={`w-[min(95vw,900px)] max-h-[90dvh] rounded-2xl p-5 backdrop:bg-black/70 ${temaEscuro ? 'bg-neutral-900 text-white' : 'bg-white text-gray-900'}`} aria-labelledby="titulo-biblioteca">
    <header className="flex justify-between gap-3 mb-4"><h2 id="titulo-biblioteca" className="text-xl font-bold">Biblioteca de vídeos de execução</h2><button type="button" className="acao-secundaria" onClick={onFechar}>Fechar biblioteca</button></header>
    <div className="grid sm:grid-cols-3 gap-3 mb-4">
      <label>Buscar exercício<input autoFocus className={campo} value={filtros.busca} onChange={e => mudar('busca', e.target.value)} placeholder="Nome ou músculo"/></label>
      <label>Grupo muscular<select aria-label="Grupo muscular" className={campo} value={filtros.grupo} onChange={e => mudar('grupo', e.target.value)}><option value="">Todos</option>{dados.grupos.map(g => <option key={g}>{g}</option>)}</select></label>
      <label>Equipamento<select aria-label="Equipamento" className={campo} value={filtros.equipamento} onChange={e => mudar('equipamento', e.target.value)}><option value="">Todos</option>{dados.equipamentos.map(g => <option key={g}>{g}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap gap-5 mb-4"><span>Todos os exercícios desta biblioteca possuem vídeo.</span><label><input type="checkbox" checked={filtros.idioma === 'pt'} onChange={e => mudar('idioma', e.target.checked ? 'pt' : '')}/> Somente em português</label></div>
    <p className="text-sm mb-4">Escolha a variação e o equipamento correspondentes à sua ficha. A biblioteca inclui conteúdo em português e inglês.</p>
    {carregando ? <p role="status">Buscando exercícios...</p> : erro ? <MensagemTemporaria as="p" role="alert">{erro} <button className="acao-secundaria" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></MensagemTemporaria> : <>
      <p className="mb-3 text-sm">{dados.total} exercícios encontrados.</p>
      <div className="space-y-3">{dados.resultados.map(item => <article key={item.id} className="border border-neutral-500/30 rounded-xl p-4 space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{item.nome}</h3><p className="text-sm">{item.grupo} · {item.equipamentos.join(', ') || 'Equipamento não informado'} · Vídeo de execução</p></div><button type="button" className="bg-sky-600 text-white rounded-lg px-4 py-2" onClick={() => onSelecionar(item)}>Selecionar {item.nome}</button></div>{item.aliases.length>0&&<p className="text-xs">Nomes na fonte: {item.aliases.join(', ')}</p>}<DemonstracaoExercicio dados={item}/></article>)}</div>
      {!dados.resultados.length && <p>Nenhum exercício corresponde aos filtros. Tente outro nome ou equipamento.</p>}
      <div className="flex justify-between mt-5"><button type="button" className="acao-secundaria disabled:opacity-40" disabled={!offset} onClick={() => setOffset(n => Math.max(0, n - 20))}>Página anterior</button><button type="button" className="acao-secundaria disabled:opacity-40" disabled={offset + 20 >= dados.total} onClick={() => setOffset(n => n + 20)}>Próxima página</button></div>
    </>}
  </dialog>;
}
