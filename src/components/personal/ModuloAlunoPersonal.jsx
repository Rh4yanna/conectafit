/* eslint-disable react/prop-types */
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import AvaliacaoPersonal from './AvaliacaoPersonal';
import PrescricaoPersonal from './PrescricaoPersonal';
import EvolucaoPersonal from './EvolucaoPersonal';
import MensagemTemporaria from '../MensagemTemporaria';
import {usePersonal} from './comum';
const titulos={treinos:'Treinos dos Alunos',anamnese:'Anamnese',avaliacoes:'Avaliação Física',fotos:'Fotos de Evolução'};
function Conteudo({alunoId,modulo}){
 const {dados,erro,carregando,carregar}=usePersonal(`/alunos/${alunoId}/avaliacao`);

 if(erro)return <div><MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria><button className="acao-secundaria" onClick={carregar}>Tentar novamente</button></div>;
 if(carregando)return <p role="status">Carregando anamnese...</p>;
 return modulo==='anamnese'?<AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/>:<><details className="mb-4"><summary className="cursor-pointer font-semibold">Consultar ou atualizar anamnese</summary><AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/></details><PrescricaoPersonal alunoId={alunoId} avaliacao={dados} onAtualizarAvaliacao={carregar}/></>;
}
export default function ModuloAlunoPersonal({modulo,alunos}){
 const [aberto,setAberto]=useState(null);
 const ordenados=[...alunos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'}));
 return <section className="space-y-5"><h1 className="text-2xl font-bold">{titulos[modulo]}</h1>{!ordenados.length&&<p>Nenhum aluno ativo vinculado.</p>}<div className="space-y-3">{ordenados.map(aluno=>{const abertoAgora=String(aberto)===String(aluno.id);return <article key={aluno.id} className="border border-neutral-500/30 rounded-2xl p-4"><button type="button" className="w-full flex items-center gap-3 text-left" aria-expanded={abertoAgora} onClick={()=>setAberto(abertoAgora?null:aluno.id)}>{aluno.foto_url&&<img src={aluno.foto_url} alt="" className="w-12 h-12 rounded-full object-cover"/>}<span className="font-bold flex-1">{aluno.nome}</span><ChevronDown aria-hidden="true" className={abertoAgora?'rotate-180':''}/></button>{abertoAgora&&<div className="pt-4">{['avaliacoes','fotos'].includes(modulo)?<EvolucaoPersonal alunoId={aluno.id} modulo={modulo}/>:<Conteudo alunoId={aluno.id} modulo={modulo}/>}</div>}</article>;})}</div></section>;
}
