import MenuInferior from '../../components/MenuInferior';
import Cabecalho from '../../components/Cabecalho';
import {NavLink} from 'react-router-dom';
import {User,Dumbbell,Utensils,Home,Compass} from 'lucide-react';
import {useTheme} from '../../context/ThemeContext';

// eslint-disable-next-line react/prop-types
export default function AlunoLayout({children}) {
  const {temaEscuro}=useTheme();
  let usuario={};try{usuario=JSON.parse(localStorage.getItem('usuario')||'{}');}catch{/* Sessao tratada pela rota. */}
  return <div data-menu-inferior className={`min-h-screen pb-28 ${temaEscuro?'bg-black text-white':'bg-gray-100 text-gray-900'}`}>
    <Cabecalho perfil="aluno" nome={usuario.nome}/>
    {children}
    <MenuInferior label="Navegação do aluno">
      {[['dashboard','Início',Home],['treinos','Treinos',Dumbbell],['servicos','Buscar',Compass],['dietas','Dietas',Utensils],['perfil','Perfil',User]].map(([rota,label,Icon])=><NavLink key={rota} to={`/aluno/${rota}`} className={({isActive})=>`flex flex-col items-center gap-1 text-[10px] font-bold ${isActive?'text-[#00AEFF]':'text-neutral-400'}`}><Icon className="w-5 h-5"/>{label}</NavLink>)}
    </MenuInferior>
  </div>;
}
