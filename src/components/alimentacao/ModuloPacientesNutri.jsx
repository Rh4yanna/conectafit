/* eslint-disable react/prop-types */
import {useEffect,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {apiFetch} from '../../config/api';
import MensagemTemporaria from '../MensagemTemporaria';
import AnamneseNutri from './AnamneseNutri';
import PlanosAlimentares from './PlanosAlimentares';
import {RetornosNutri,DiarioNutri} from './AcompanhamentoNutri';
import {useNutricao} from './nutricao';
import EvolucaoPersonal from '../personal/EvolucaoPersonal';
import CobrancasPersonal from '../personal/CobrancasPersonal';
import ProntuarioNutri from './ProntuarioNutri';

const titulos={anamnese:'Anamnese nutricional',planos:'Planos alimentares',feedbacks:'Orientações e retornos',evolucao:'Evolução e fotos',avaliacoes:'Avaliações',prontuario:'Prontuário nutricional'};
function AnamneseOuPlano({alunoId,modulo}){
 const {dados,erro,carregando,carregar}=useNutricao(`/pacientes/${alunoId}/anamnese`);
 if(carregando)return <p role="status">Carregando anamnese...</p>;
 if(erro)return <><MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria><button className="acao-secundaria" onClick={carregar}>Tentar novamente</button></>;
 return modulo==='anamnese'?<AnamneseNutri alunoId={alunoId} avaliacao={dados} onSalvar={carregar}/>:<PlanosAlimentares alunoId={alunoId} anamnese={dados}/>;
}
function DadosPaciente({alunoId,modulo}){
 if(modulo==='prontuario')return <ProntuarioCompleto alunoId={alunoId}/>;
 if(modulo==='evolucao'||modulo==='avaliacoes')return <EvolucaoPersonal alunoId={alunoId} modulo={modulo==='evolucao'?'fotos':'avaliacoes'} tipo="nutri"/>;
 if(modulo==='feedbacks')return <FeedbackPaciente alunoId={alunoId}/>;
 return <AnamneseOuPlano alunoId={alunoId} modulo={modulo}/>;
}
function FeedbackPaciente({alunoId}){
 const [registro,setRegistro]=useState(null);
 return <div className="space-y-4"><DiarioNutri alunoId={alunoId} selecionar={setRegistro}/><RetornosNutri key={registro?.id||'geral'} alunoId={alunoId} registro={registro}/></div>;
}
function ProntuarioCompleto({alunoId}){
 const [aberto,setAberto]=useState('');
 const itens=[['anamnese','Anamnese'],['avaliacoes','Avaliações'],['evolucao','Fotos de evolução'],['planos','Planos alimentares'],['feedbacks','Orientações e retornos']];
 return <div className="space-y-4"><ProntuarioNutri alunoId={alunoId}/>{itens.map(([id,titulo])=><section className="border rounded-xl p-4" key={id}><button className="w-full flex justify-between font-bold text-left" type="button" aria-expanded={aberto===id} onClick={()=>setAberto(aberto===id?'':id)}>{titulo}<ChevronDown aria-hidden="true" className={aberto===id?'rotate-180':''}/></button>{aberto===id&&<div className="pt-4"><DadosPaciente alunoId={alunoId} modulo={id}/></div>}</section>)}</div>;
}
export default function ModuloPacientesNutri({modulo}){
 const [alunos,setAlunos]=useState([]),[aberto,setAberto]=useState(null),[erro,setErro]=useState(''),[carregando,setCarregando]=useState(true);
 useEffect(()=>{let ativo=true;apiFetch('/profissional/alunos').then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar os pacientes.');return r.json();}).then(d=>{if(ativo)setAlunos(d.filter(a=>a.ativo).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'})));}).catch(e=>{if(ativo)setErro(e.message);}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[]);
 if(modulo==='cobrancas'&&!carregando&&!erro)return <CobrancasPersonal alunos={alunos} tipo="nutri"/>;
 return <section className="space-y-4"><h1 className="text-2xl font-bold">{titulos[modulo]||'Cobranças'}</h1>{carregando&&<p role="status">Carregando pacientes...</p>}{erro&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}{!carregando&&!erro&&!alunos.length&&<p>Nenhum paciente ativo vinculado.</p>}{alunos.map(a=>{const abertoAgora=aberto===a.id;return <article key={a.id} className="border border-neutral-500/30 rounded-2xl p-4"><button type="button" className="w-full flex items-center gap-3 text-left" aria-expanded={abertoAgora} onClick={()=>setAberto(abertoAgora?null:a.id)}><span className="font-bold flex-1">{a.nome}</span><ChevronDown aria-hidden="true" className={abertoAgora?'rotate-180':''}/></button>{abertoAgora&&<div className="pt-4"><DadosPaciente alunoId={a.id} modulo={modulo}/></div>}</article>;})}</section>;
}
