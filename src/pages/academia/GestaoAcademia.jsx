import PropTypes from 'prop-types';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import { Link } from 'react-router-dom';
import MensalidadesAcademia from './MensalidadesAcademia';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';

const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const campo = 'w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-sm';
const botao = 'rounded-xl bg-sky-500 text-black font-bold px-4 py-3 disabled:opacity-50';

export default function GestaoAcademia({ tela = 'inicio' }) {
  const [dados,setDados]=useState(null);
  const [erro,setErro]=useState('');
  const [salvando,setSalvando]=useState(false);
  const [periodo,setPeriodo]=useState('mes');
  const [aluno,setAluno]=useState({nome:'',email:''});
  const [lancamento,setLancamento]=useState({tipo:'receita',descricao:'',valor:'',data:new Date().toLocaleDateString('en-CA')});
  const carregar=async()=>{
    const r=await apiFetch('/academia/gestao');
    if(!r.ok)throw new Error('Não foi possível carregar a gestão da academia.');
    setDados(await r.json());
  };
  useEffect(()=>{carregar().catch(e=>setErro(e.message));},[]);
  const salvar=async(caminho,body,method='POST')=>{
    setSalvando(true);setErro('');
    try {
      const r=await apiFetch(`/academia/${caminho}`,{method,body:JSON.stringify(body)});
      if(!r.ok)throw new Error((await r.json()).message);
      if(caminho==='matriculas')setAluno({nome:'',email:''});
      if(caminho==='lancamentos')setLancamento(v=>({...v,descricao:'',valor:''}));
      await carregar();
    }catch(e){setErro(e.message);}finally{setSalvando(false);}
  };
  const resumo=dados?.resumo;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{tela === 'alunos' ? 'Alunos da academia' : tela === 'pagamentos' ? 'Pagamentos da academia' : 'Visão geral da academia'}</h2><p className="text-sm text-neutral-400">{tela === 'alunos' ? 'Cadastre alunos e gerencie as matrículas e planos.' : tela === 'pagamentos' ? 'Gerencie mensalidades, recebimentos e despesas.' : 'Acompanhe os indicadores da sua unidade.'}</p></div>{tela === 'inicio' && <select aria-label="Período do resumo" className={campo+' !w-auto'} value={periodo} onChange={e=>setPeriodo(e.target.value)}><option value="mes">Mês atual</option><option value="semana">Semana atual</option></select>}</div>
    {erro&&<MensagemTemporaria as="p" role="alert" className="text-red-400">{erro}<button className="ml-3 acao-secundaria" onClick={()=>carregar().then(()=>setErro('')).catch(e=>setErro(e.message))}>Tentar novamente</button></MensagemTemporaria>}
    {!dados?<p>Carregando indicadores...</p>:<>
      {tela === 'inicio' && <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
        ['Alunos matriculados ativos',dados.matriculas.filter(a=>a.ativo).length],
        ['Receitas recebidas',moeda(resumo[`receita_${periodo}`])],
        ['Despesas pagas',moeda(resumo[`despesa_${periodo}`])],
        ['Resultado do período',moeda(Number(resumo[`receita_${periodo}`])-Number(resumo[`despesa_${periodo}`]))],
      ].map(([titulo,valor])=><article key={titulo} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"><p className="text-xs text-neutral-400">{titulo}</p><p className="text-2xl font-black text-sky-400 mt-2">{valor}</p></article>)}</div>
      <div className="grid sm:grid-cols-2 gap-4"><Link to="/academia/alunos" className={botao+' text-center'}>Cadastrar e gerenciar alunos</Link><Link to="/academia/pagamentos" className={botao+' text-center'}>Gerenciar pagamentos</Link></div>
      </>}
      {tela === 'alunos' && <>
        <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4"><h3 className="font-bold">Alunos da unidade</h3><form className="space-y-3" onSubmit={e=>{e.preventDefault();salvar('matriculas',aluno);}}><label className="block text-sm">Nome<input className={campo} required minLength={3} maxLength={120} value={aluno.nome} onChange={e=>setAluno({...aluno,nome:e.target.value})}/></label><label className="block text-sm">E-mail<input className={campo} required type="email" maxLength={254} value={aluno.email} onChange={e=>setAluno({...aluno,email:e.target.value})}/></label><button disabled={salvando} className={botao}>Registrar matrícula</button></form>
          <p className="text-xs text-neutral-400">A matrícula registra o aluno nesta unidade. Ela não cria uma conta de acesso.</p>
          {!dados.matriculas.length&&<p className="text-neutral-400 text-sm">Nenhuma matrícula registrada. Cadastre o primeiro aluno acima.</p>}

        </section>
        </>}
        {tela === 'pagamentos' && <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4"><h3 className="font-bold">Registrar receita ou despesa</h3><form className="space-y-3" onSubmit={e=>{e.preventDefault();salvar('lancamentos',lancamento);}}><label className="block text-sm">Tipo<select className={campo} value={lancamento.tipo} onChange={e=>setLancamento({...lancamento,tipo:e.target.value})}><option value="receita">Receita recebida</option><option value="despesa">Despesa paga</option></select></label><label className="block text-sm">Descrição<input className={campo} required minLength={3} maxLength={200} placeholder="Ex.: mensalidade ou manutenção" value={lancamento.descricao} onChange={e=>setLancamento({...lancamento,descricao:e.target.value})}/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Valor (R$)<input className={campo} required type="number" min="0.01" step="0.01" value={lancamento.valor} onChange={e=>setLancamento({...lancamento,valor:e.target.value})}/></label><label className="text-sm">Data<input className={campo} required type="date" value={lancamento.data} onChange={e=>setLancamento({...lancamento,data:e.target.value})}/></label></div><button disabled={salvando} className={botao}>Registrar lançamento</button></form></section>}
      {tela !== 'inicio' && <MensalidadesAcademia modo={tela} alunos={dados.matriculas} onAtualizar={carregar}/>}
      {tela === 'pagamentos' && <>
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"><h3 className="font-bold mb-3">Últimos lançamentos (até 100)</h3>{!dados.lancamentos.length?<p className="text-sm text-neutral-400">Nenhum lançamento registrado.</p>:<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2">Tipo</th><th className="p-2 text-right">Valor</th></tr></thead><tbody>{dados.lancamentos.map(l=><tr key={l.id} className="border-t border-neutral-800"><td className="p-2 whitespace-nowrap">{l.data.split('-').reverse().join('/')}</td><td className="p-2">{l.descricao}</td><td className="p-2">{l.tipo==='receita'?'Receita':'Despesa'}</td><td className={`p-2 text-right whitespace-nowrap ${l.tipo==='receita'?'text-sky-400':'text-red-400'}`}>{moeda(l.valor)}</td></tr>)}</tbody></table></div>}</section>
      </>}
    </>}
  </section>;
}

GestaoAcademia.propTypes = {tela: PropTypes.string};
