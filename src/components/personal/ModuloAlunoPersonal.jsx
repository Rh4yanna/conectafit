/* eslint-disable react/prop-types */
import {useState} from 'react';
import AvaliacaoPersonal from './AvaliacaoPersonal';
import PrescricaoPersonal from './PrescricaoPersonal';
import EvolucaoPersonal from './EvolucaoPersonal';
import MensagemTemporaria from '../MensagemTemporaria';
import {usePersonal,campo} from './comum';
const titulos={treinos:'Treinos dos Alunos',anamnese:'Anamnese',avaliacoes:'Avaliação Física',fotos:'Fotos de Evolução'};
function Conteudo({alunoId,modulo}){
 const {dados,erro,carregando,carregar}=usePersonal(`/alunos/${alunoId}/avaliacao`);

 if(erro)return <div><MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria><button className="acao-secundaria" onClick={carregar}>Tentar novamente</button></div>;
 if(carregando)return <p role="status">Carregando anamnese...</p>;
 return modulo==='anamnese'?<AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/>:<><details className="mb-4"><summary className="cursor-pointer font-semibold">Consultar ou atualizar anamnese</summary><AvaliacaoPersonal alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/></details><PrescricaoPersonal alunoId={alunoId} avaliacao={dados} onAtualizarAvaliacao={carregar}/></>;
}
export default function ModuloAlunoPersonal({modulo,alunos}){
 const [aluno,setAluno]=useState('');
 const selecionado=alunos.find(a=>String(a.id)===aluno);
 return <section className="space-y-5"><h1 className="text-2xl font-bold">{titulos[modulo]}</h1><label className="block max-w-lg">Aluno vinculado<select className={campo} value={aluno} onChange={e=>setAluno(e.target.value)}><option value="">Selecione um aluno</option>{alunos.map(a=><option value={a.id} key={a.id}>{a.nome}</option>)}</select></label>{selecionado&&<div className="flex items-center gap-3">{selecionado.foto_url&&<img src={selecionado.foto_url} alt={`Foto de ${selecionado.nome}`} className="w-12 h-12 rounded-full object-cover"/>}<div><p className="font-bold">{selecionado.nome}</p><p>{selecionado.email}</p>{selecionado.telefone&&<p>{selecionado.telefone}</p>}</div></div>}{!alunos.length&&<p>Nenhum aluno ativo vinculado.</p>}{aluno&&(['avaliacoes','fotos'].includes(modulo)?<EvolucaoPersonal key={`${modulo}:${aluno}`} alunoId={aluno} modulo={modulo}/>:<Conteudo key={`${modulo}:${aluno}`} alunoId={aluno} modulo={modulo}/>)}</section>;
}
