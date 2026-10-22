import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import Atendimentos from '../../components/rotina/Atendimentos';
import Checkins from '../../components/rotina/Checkins';
import Retornos from '../../components/rotina/Retornos';
import AbasAluno from '../../components/aluno/AbasAluno';
const areas=[['agenda','Atendimentos'],['checkin','Check-in semanal'],['retornos','Retornos dos profissionais']];
export default function RotinaAluno(){
 const {hash}=useLocation();const [aba,setAba]=useState('agenda');
 useEffect(()=>{const id=hash.slice(1);if(areas.some(([a])=>a===id))setAba(id);},[hash]);
 return <main className="p-5 lg:p-10 pb-28 space-y-6"><header><h1 className="text-2xl font-bold">Minha rotina</h1></header><AbasAluno itens={areas} valor={aba} onChange={setAba}/><div hidden={aba!=='agenda'}><Atendimentos/></div><div hidden={aba!=='checkin'}><Checkins/></div><div hidden={aba!=='retornos'}><Retornos/></div></main>;
}
