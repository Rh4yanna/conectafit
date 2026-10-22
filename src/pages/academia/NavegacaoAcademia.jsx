/* eslint-disable react/prop-types */
import {Home,Users,CalendarDays,Wallet,Building2} from 'lucide-react';
import MenuInferior from '../../components/MenuInferior';
import {abasAcademia} from './navegacao-academia';
export default function NavegacaoAcademia({aba,permitidas,navegar}){
 const relacionados={inicio:['equipe'],alunos:['presenca'],agenda:['turmas','visitas'],pagamentos:['contas','historico'],perfil:['equipe']};
 const extras=Object.entries(relacionados).find(([principal,itens])=>principal===aba||itens.includes(aba));
 return <>
 {extras&&<nav aria-label="Áreas relacionadas" className="flex flex-wrap gap-2">{[extras[0],...extras[1]].filter(a=>permitidas.includes(a)).map(a=><button key={a} onClick={()=>navegar(a)} aria-current={aba===a?'page':undefined} className={`rounded-xl border px-4 py-2 ${aba===a?'border-sky-500 text-sky-400 bg-sky-500/10':'border-neutral-500/30'}`}>{abasAcademia[a]}</button>)}</nav>}
 <MenuInferior label="Navegação da academia">{[['inicio','Início',Home],['alunos','Alunos',Users],['agenda','Agenda',CalendarDays],['pagamentos','Financeiro',Wallet],['perfil','Perfil',Building2]].filter(([a])=>permitidas.includes(a)).map(([a,label,Icon])=><button type="button" key={a} onClick={()=>navegar(a)} aria-current={aba===a?'page':undefined} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${aba===a?'text-sky-400 bg-sky-500/10':'text-neutral-400'}`}><Icon size={20}/>{label}</button>)}</MenuInferior>
 </>;
}
