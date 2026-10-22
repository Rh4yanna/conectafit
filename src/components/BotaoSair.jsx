import MensagemTemporaria from './MensagemTemporaria';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOut} from 'lucide-react';
import {encerrarSessao} from '../config/api';
export default function BotaoSair(){
  const navigate=useNavigate(),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState('');
  const sair=async()=>{setOcupado(true);setErro('');try{await encerrarSessao();navigate('/login',{replace:true});}catch(e){setErro(e.message);}finally{setOcupado(false);}};
  return <div className="p-3"><button type="button" disabled={ocupado} onClick={sair} className="flex items-center gap-2 text-red-400 font-semibold"><LogOut aria-hidden="true"/>{ocupado?'Encerrando...':'Sair da conta'}</button>{erro&&<MensagemTemporaria as="p" role="alert" className="text-sm mt-2 text-red-400">{erro}</MensagemTemporaria>}</div>;
}
