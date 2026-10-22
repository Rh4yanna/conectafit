/* eslint-disable react/prop-types */
import {Formulario,hoje,dia,moeda} from './operacao-comum';

export default function ResumoMatricula({matricula,dados,gestor,salvar,inicio,fim}) {
 const id=matricula.id;
 const presencas=dados.presencas.filter(p=>String(p.matricula_id)===String(id)&&!p.cancelada);
 const cobrancas=dados.mensalidades.filter(m=>String(m.matricula_id)===String(id));
 const vigente=matricula.situacao==='ativa'&&(!matricula.inicio||matricula.inicio<=hoje())&&(!matricula.termino||matricula.termino>=hoje());
 return <section aria-label={`Resumo de ${matricula.aluno_nome}`} className="space-y-4 border-t border-neutral-500/30 pt-4">
  <h3 className="font-semibold">Acompanhamento do aluno</h3>
  <p>Matrícula #{id} · {presencas.length} presenças de {dia(inicio)} a {dia(fim)}</p>
  {vigente?<Formulario titulo={`Presença de ${matricula.aluno_nome}`} inicial={{data:hoje()}} campos={[{k:'data',label:'Data da presença',tipo:'date'}]} label="Registrar presença" enviar={b=>salvar('/presencas','POST',{...b,matricula_id:id})}/>:<p>A presença estará disponível quando a matrícula estiver ativa e vigente.</p>}
  {gestor&&<>
   <h3 className="font-semibold">Mensalidades do aluno</h3>
   <p>Saldo pendente: <strong>{moeda(cobrancas.reduce((s,c)=>s+Number(c.saldo),0))}</strong></p>
   <details><summary className="cursor-pointer">Gerar mensalidade para este aluno</summary><Formulario titulo={`Mensalidade de ${matricula.aluno_nome}`} inicial={{competencia:hoje().slice(0,7)}} campos={[{k:'competencia',label:'Competência',tipo:'month'}]} label="Gerar cobrança" enviar={b=>salvar(`/matriculas/${id}/mensalidades`,'POST',b)}/></details>
   {!cobrancas.length&&<p>Nenhuma mensalidade gerada.</p>}
   {cobrancas.map(c=><details key={`${c.id}-${c.recebido}-${c.desconto}`} className="rounded-xl border border-neutral-500/30 p-3">
    <summary className="cursor-pointer">{c.competencia.slice(0,7)} · {c.status} · Saldo {moeda(c.saldo)}</summary>
    <p className="my-3">Vencimento: {dia(c.vencimento)} · Recebido: {moeda(c.recebido)} · Desconto: {moeda(c.desconto)}</p>
    {Number(c.saldo)>0&&<Formulario titulo={`Receber mensalidade ${c.id}`} inicial={{data:hoje(),valor:c.saldo,chave_cliente:crypto.randomUUID()}} campos={[{k:'valor',label:'Valor do pagamento',tipo:'number',min:'0.01',max:c.saldo,step:'0.01'},{k:'data',label:'Data do pagamento',tipo:'date'}]} label="Registrar pagamento" enviar={b=>salvar(`/mensalidades/${c.id}/pagamento`,'POST',b)}/>}
   </details>)}
  </>}
 </section>;
}
