import AbasAluno from '../aluno/AbasAluno';
import {Utensils,ArrowLeftRight,ShoppingBasket} from 'lucide-react';
import TrocarAlimento from '../aluno/TrocarAlimento';
import MensagemTemporaria from '../MensagemTemporaria';
import RefeicoesAluno from './RefeicoesAluno';
import {AcervoNutri,ArquivoPlano} from './AcervoNutri';
/* eslint-disable react/prop-types */
import { useCallback,useEffect,useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { alimentacao,dataBR,quantidade } from './comum';
import FormPlanoAlimentar from './FormPlanoAlimentar';
import DetalhesPlanoAlimentar from './DetalhesPlanoAlimentar';
import ListaCompras from './ListaCompras';
import ListaComprasAluno from './ListaComprasAluno';
import ModalAlimentacao from './ModalAlimentacao';
export default function PlanosAlimentares({alunoId,onRegistrar,onDuvida,anamnese=null,areaAluno,onAreaAluno,simplificado=false}){
  const {temaEscuro}=useTheme();const profissional=Boolean(alunoId);const GrupoPlanos=profissional?'div':'details';
  const [areaInterna,setAreaInterna]=useState('refeicoes');
  const area=areaAluno??areaInterna;
  const setArea=onAreaAluno??setAreaInterna;
  const [planos,setPlanos]=useState([]),[loading,setLoading]=useState(true),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState(''),[ocupado,setOcupado]=useState(false);
  const [form,setForm]=useState(null),[detalhe,setDetalhe]=useState(null),[compras,setCompras]=useState(null),[excluir,setExcluir]=useState(null);
  const [excluirRefeicao,setExcluirRefeicao]=useState(null);
  const carregar=useCallback(async()=>{setLoading(true);setErro('');try{setPlanos(await alimentacao(`/planos${alunoId?`?aluno_id=${alunoId}`:''}`));}catch(e){setErro(e.message);}finally{setLoading(false);}},[alunoId]);
  useEffect(()=>{carregar();},[carregar]);
  const vigente=async p=>{setOcupado(true);setErro('');try{await alimentacao(`/planos/${p.id}/vigente`,'PUT',{});setMensagem('Plano definido para acompanhamento atual.');await carregar();}catch(e){setErro(e.message);}finally{setOcupado(false);}};
  const remover=async()=>{setOcupado(true);setErro('');try{await alimentacao(`/planos/${excluir.id}`,'DELETE',{versao:excluir.versao});setExcluir(null);setMensagem('Plano excluído. Os registros do diário foram preservados.');await carregar();}catch(e){setErro(e.message);setExcluir(null);}finally{setOcupado(false);}};
  const removerRefeicao=async()=>{
    const {plano,refeicao}=excluirRefeicao;
    if(plano.origem!=='pessoal')return;
    setOcupado(true);setErro('');
    try {
      const refeicoes=plano.refeicoes.filter(r=>r.id!==refeicao.id);
      if(refeicoes.length)await alimentacao(`/planos/${plano.id}`,'PUT',{...plano,refeicoes});
      else await alimentacao(`/planos/${plano.id}`,'DELETE',{versao:plano.versao});
      setExcluirRefeicao(null);setMensagem('Refeição excluída. Registros do diário preservados.');await carregar();
    }catch(e){setErro(e.message);setExcluirRefeicao(null);}finally{setOcupado(false);}
  };
  if(profissional&&simplificado)return <section className="space-y-4 mt-4" aria-label="Plano alimentar">
    <button className="rounded-xl bg-sky-600 text-white px-4 py-3" onClick={()=>setForm({})}>Montar dieta</button>
    {erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{mensagem&&<MensagemTemporaria as="p" role="status">{mensagem}</MensagemTemporaria>}
    {loading?<p role="status">Carregando planos...</p>:!planos.length?<p>Nenhum plano disponível.</p>:planos.map(p=><article key={p.id} className="border rounded-xl p-4 space-y-4"><h3 className="font-bold text-lg">{p.titulo}</h3>
      {p.refeicoes.map(r=><div className="border-t border-neutral-500/30 pt-3" key={r.id}><h4 className="font-semibold">{r.nome}</h4>{r.alimentos?.length?<ul className="space-y-1">{r.alimentos.map((a,i)=><li key={i} className="flex justify-between gap-2"><span>{a.nome}</span><span>{quantidade(a)}</span></li>)}</ul>:<p>{r.detalhes}</p>}{r.orientacoes&&<p className="whitespace-pre-wrap">{r.orientacoes}</p>}</div>)}
      {p.descricao&&<p className="whitespace-pre-wrap">{p.descricao}</p>}
      <div className="flex flex-wrap gap-3"><button className="acao-secundaria" onClick={()=>setForm(p)}>Revisar dieta</button><button className="acao-secundaria text-red-500" onClick={()=>setExcluir(p)}>Excluir</button></div></article>)}
    {form&&<FormPlanoAlimentar anamnese={anamnese} plano={form.refeicoes?form:null} profissional alunoId={alunoId} onClose={()=>setForm(null)} onSalvo={()=>{setForm(null);setMensagem('Plano salvo.');carregar();}}/>}
    {excluir&&<ModalAlimentacao titulo="Excluir plano alimentar?" onClose={()=>setExcluir(null)} ocupado={ocupado}><p>O plano “{excluir.titulo}” será removido da lista. Os registros já feitos no diário serão preservados.</p><button disabled={ocupado} className="mt-4 bg-red-600 text-white rounded-lg p-3" onClick={remover}>{ocupado?'Excluindo...':'Confirmar exclusão'}</button></ModalAlimentacao>}
  </section>;
  return <section className="space-y-4" aria-label="Planos alimentares">{!profissional&&<AbasAluno distribuir valor={area} onChange={setArea} itens={[['refeicoes','Minhas refeições',Utensils],['trocar','Trocar alimento',ArrowLeftRight],['compras','Lista de compras',ShoppingBasket]]}/>}<div hidden={!profissional&&area!=='refeicoes'} className="space-y-4"><header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">{profissional?'Planos enviados por você':'Meus planos alimentares'}</h2></div><button className="rounded-xl bg-sky-600 text-white px-4 py-3" onClick={()=>setForm({})}>{profissional?'Criar plano profissional':'Adicionar refeição'}</button></header>
    {!profissional&&<RefeicoesAluno planos={planos} onRegistrar={onRegistrar} onDuvida={onDuvida} onEditar={setForm} onExcluir={(plano,refeicao)=>setExcluirRefeicao({plano,refeicao})}/>} 
    {profissional&&<AcervoNutri key={form?'editando':mensagem} alunoId={alunoId} abrir={setForm}/>}
    {erro&&<MensagemTemporaria as="p" role="alert" className="border border-red-500 rounded-xl p-3">{erro} <button className="acao-secundaria" onClick={carregar}>Recarregar planos</button></MensagemTemporaria>}{mensagem&&<MensagemTemporaria as="p" role="status">{mensagem}</MensagemTemporaria>}
    {loading?<p role="status">Carregando planos...</p>:<>{!planos.length&&<p>Nenhum plano disponível. {profissional?'Crie o primeiro plano para este paciente.':'Você pode criar uma organização pessoal ou receber um plano do seu nutricionista.'}</p>}{!profissional&&planos.length>0&&!planos.some(p=>p.vigente)&&<p className="border border-amber-500 rounded-lg p-3">Escolha “Definir como atual” no plano que você segue.</p>}
      <GrupoPlanos>{!profissional&&<summary className="cursor-pointer font-semibold py-3">Gerenciar planos e consultar versões</summary>}<div className="grid lg:grid-cols-2 gap-4">{planos.map(p=><article key={p.id} className={`border rounded-2xl p-5 space-y-4 ${p.vigente?'border-sky-500':'border-neutral-500/30'} ${temaEscuro?'bg-neutral-900':'bg-white text-gray-900'}`}><div><p className="text-sm font-bold text-sky-500">{p.vigente?'Plano vigente':p.ativo?'Disponível para consulta':'Arquivado'} · versão {p.versao}</p><h3 className="font-bold text-lg mt-2">{p.titulo}</h3><p className="text-sm mt-1">{p.origem==='nutricionista'?`Prescrição profissional · ${p.autoria||'Nutricionista responsável'}`:'Organização pessoal · não é prescrição profissional'}</p></div><p className="text-sm">{p.refeicoes.length} refeições · Atualizado em {dataBR(p.atualizado_em)}</p>{p.revisao_em&&<p className="text-sm">Revisão prevista: {p.revisao_em.slice(0,10)}</p>}{p.meta_calorias&&<p className="text-sm">Meta informada pelo autor: {p.meta_calorias} kcal</p>}
        <div className="flex flex-wrap gap-3"><button className="rounded-lg bg-sky-600 text-white p-2.5" onClick={()=>setDetalhe(p)}>Consultar refeições e versões</button><button className="acao-secundaria" onClick={()=>{setCompras(p);if(!profissional)setArea('compras');}}>Lista de compras</button>{!p.vigente&&p.ativo&&<button disabled={ocupado} className="acao-secundaria" onClick={()=>vigente(p)}>Definir como atual</button>}{p.ativo&&(profissional||p.origem==='pessoal')&&<button className="acao-secundaria" onClick={()=>setForm(p)}>Editar plano</button>}{profissional&&<><button className="acao-secundaria" onClick={()=>setForm({...p,id:null,versao:0,revisao_em:'',titulo:`Cópia de ${p.titulo}`.slice(0,120),avaliacao_referencia:null})}>Duplicar plano</button><ArquivoPlano plano={p} onSalvar={carregar}/></>}{!profissional&&p.origem==='pessoal'&&<button className="acao-secundaria text-red-500" onClick={()=>setExcluir(p)}>Excluir plano pessoal</button>}</div>
      </article>)}</div></GrupoPlanos></>}
    </div>{!profissional&&area==='trocar'&&<TrocarAlimento planos={planos} onDuvida={onDuvida} onAtualizar={carregar}/>}
    {!profissional&&area==='compras'&&(loading?<p role="status">Carregando lista...</p>:erro?<p role="alert">{erro} <button onClick={carregar}>Tentar novamente</button></p>:(compras||planos.find(p=>p.vigente)||planos.find(p=>p.ativo)||planos[0])?<ListaComprasAluno plano={compras||planos.find(p=>p.vigente)||planos.find(p=>p.ativo)||planos[0]}/>:<p>Adicione um plano alimentar para criar sua lista.</p>)}
    {form&&<FormPlanoAlimentar anamnese={anamnese} plano={form.refeicoes?form:null} profissional={profissional} alunoId={alunoId} onClose={()=>setForm(null)} onSalvo={()=>{setForm(null);setMensagem('Plano salvo. O histórico de versões está disponível na consulta.');carregar();}}/>}
    {detalhe&&<DetalhesPlanoAlimentar plano={detalhe} onClose={()=>setDetalhe(null)} onRegistrar={onRegistrar?dados=>{setDetalhe(null);onRegistrar(dados);}:undefined} onDuvida={onDuvida?dados=>{setDetalhe(null);onDuvida(dados);}:undefined}/>}
    {compras&&profissional&&<ListaCompras plano={compras} onClose={()=>setCompras(null)}/>}
    {excluirRefeicao&&<ModalAlimentacao titulo="Excluir refeição pessoal?" onClose={()=>setExcluirRefeicao(null)} ocupado={ocupado}><p>A refeição {excluirRefeicao.refeicao.nome} será removida. {excluirRefeicao.plano.refeicoes.length===1?'Como ela é a única refeição, o plano pessoal também será removido. ':''}Os registros do diário serão preservados.</p><button disabled={ocupado} className="mt-4 bg-red-600 text-white rounded-lg p-3" onClick={removerRefeicao}>Confirmar exclusão da refeição</button></ModalAlimentacao>}
    {excluir&&<ModalAlimentacao titulo="Excluir plano pessoal?" onClose={()=>setExcluir(null)} ocupado={ocupado}><p>O plano “{excluir.titulo}” sairá da sua lista. Registros já feitos no diário mantêm a refeição original. Esta ação não pode ser desfeita pela tela.</p><button disabled={ocupado} className="mt-4 bg-red-600 text-white rounded-lg p-3" onClick={remover}>{ocupado?'Excluindo...':'Confirmar exclusão do plano'}</button></ModalAlimentacao>}
  </section>;
}
