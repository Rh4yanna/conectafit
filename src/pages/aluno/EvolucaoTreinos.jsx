import MensagemTemporaria from '../../components/MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
export default function EvolucaoTreinos({ atualizacao }) {
  const [dados, setDados] = useState([]); const [chave, setChave] = useState(''); const [erro, setErro] = useState(''); const [loading, setLoading] = useState(true); const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setErro('');
    apiFetch('/sessoes-treino/evolucao', { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error(); const d = await r.json(); setDados(d.exercicios); }).catch(() => { if (!controller.signal.aborted) setErro('Não foi possível carregar a evolução.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [atualizacao, tentativa]);
  const ex = dados.find(e => e.chave === chave) || dados[0];
  const pontos = ex?.pontos || [];
  const maior = Math.max(1, ...pontos.map(p => p.carga_maxima));
  return <section className="border border-neutral-500/30 rounded-2xl p-5 space-y-4" aria-label="Evolução de cargas">
    <h2 className="text-xl font-bold">Evolução de cargas</h2><p className="text-sm">Até 30 sessões concluídas por exercício nos últimos 180 dias. Carga máxima por série; volume = soma de carga × repetições. Compare a mesma variação e o mesmo equipamento.</p>
    {loading ? <p role="status">Carregando evolução...</p> : erro ? <MensagemTemporaria as="p" role="alert">{erro} <button className="acao-secundaria" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></MensagemTemporaria> : !ex ? <p>Conclua uma sessão para começar a acompanhar sua evolução.</p> : <>
      <label className="block">Exercício<select className="block w-full max-w-lg border border-neutral-500 rounded-lg p-3 bg-transparent" value={ex.chave} onChange={e => setChave(e.target.value)}>{dados.map(e => <option className="text-black" value={e.chave} key={e.chave}>{e.nome}</option>)}</select></label>
      <svg viewBox="0 0 600 160" className="w-full max-w-3xl" role="img" aria-label={`Carga máxima de ${ex.nome}, em kg. Valores disponíveis na tabela abaixo.`}>
        <line x1="35" y1="130" x2="580" y2="130" stroke="currentColor" opacity="0.3"/>
        <polyline fill="none" stroke="#0284c7" strokeWidth="3" points={pontos.map((p, i) => `${35 + i * 545 / Math.max(1, pontos.length - 1)},${130 - p.carga_maxima / maior * 110}`).join(' ')}/>
        {pontos.map((p, i) => <circle key={p.sessao_id} cx={35 + i * 545 / Math.max(1, pontos.length - 1)} cy={130 - p.carga_maxima / maior * 110} r="4" fill="#0284c7"><title>{new Date(p.data).toLocaleDateString('pt-BR')}: {p.carga_maxima} kg</title></circle>)}
        <text x="5" y="15" fill="currentColor" fontSize="12">{maior} kg</text><text x="5" y="146" fill="currentColor" fontSize="12">0 kg</text>
      </svg>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left mb-2">Registros de {ex.nome}</caption><thead><tr>{['Data', 'Carga máxima (kg)', 'Repetições', 'Volume (kg × rep.)'].map(t => <th className="p-2" key={t}>{t}</th>)}</tr></thead><tbody>{pontos.map(p => <tr className="border-t border-neutral-500/30" key={p.sessao_id}><td className="p-2">{new Date(p.data).toLocaleDateString('pt-BR')}</td><td className="p-2">{p.carga_maxima}</td><td className="p-2">{p.repeticoes ?? 'Não informado'}</td><td className="p-2">{p.volume ?? 'Não calculado'}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
