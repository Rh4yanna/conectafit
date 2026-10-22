import ModalAlimentacao from '../../components/alimentacao/ModalAlimentacao';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import {RetornosNutri} from '../../components/alimentacao/AcompanhamentoNutri';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import PlanosAlimentares from '../../components/alimentacao/PlanosAlimentares';
import DiarioAlimentar,{FormRegistroAlimentar} from '../../components/alimentacao/DiarioAlimentar';
import DuvidasAlimentares,{FormDuvidaAlimentar} from '../../components/alimentacao/DuvidasAlimentares';
export default function MinhaDieta(){
  const [registrosAbertos,setRegistrosAbertos]=useState(false);const {temaEscuro}=useTheme();const [registro,setRegistro]=useState(null),[duvida,setDuvida]=useState(null),[atualizacao,setAtualizacao]=useState(0),[mensagem,setMensagem]=useState('');
  return <main className={`px-5 lg:px-10 py-8 pb-28 space-y-8 ${temaEscuro?'text-white':'text-gray-900'}`}>
    <header><h1 className="text-2xl font-bold">Minha alimentação</h1></header>
    {mensagem&&<MensagemTemporaria as="p" role="status" className="border border-sky-500 rounded-xl p-3">{mensagem}</MensagemTemporaria>}
    <PlanosAlimentares onRegistrar={setRegistro} onDuvida={setDuvida}/>
    <button className="acao-secundaria" onClick={()=>setRegistrosAbertos(true)}>Consultar meus registros de refeições</button>{registrosAbertos&&<ModalAlimentacao titulo="Meus registros de refeições" onClose={()=>setRegistrosAbertos(false)}><DiarioAlimentar atualizacao={atualizacao} onEditar={r=>{setRegistrosAbertos(false);setRegistro(r);}} onNovo={()=>{setRegistrosAbertos(false);setRegistro({});}}/></ModalAlimentacao>}
    <details className="border border-neutral-500/25 rounded-2xl p-4"><summary className="font-semibold cursor-pointer">Minhas dúvidas ao nutricionista</summary><DuvidasAlimentares atualizacao={atualizacao}/></details>
    {registro&&<FormRegistroAlimentar registro={registro} onClose={()=>setRegistro(null)} onSalvo={()=>{setRegistro(null);setAtualizacao(n=>n+1);setMensagem('Refeição salva!');}}/>}
    {duvida&&<FormDuvidaAlimentar refeicao={duvida} onClose={()=>setDuvida(null)} onSalvo={()=>{setDuvida(null);setAtualizacao(n=>n+1);setMensagem('Dúvida enviada ao nutricionista!');}}/>}
  <RetornosNutri compacto/></main>;
}
