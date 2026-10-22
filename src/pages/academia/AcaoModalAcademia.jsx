/* eslint-disable react/prop-types */
import {useState} from 'react';
import Modal from '../../components/alimentacao/ModalAlimentacao';
import {botao} from './operacao-comum';
export default function AcaoModalAcademia({titulo,children}){
 const [aberto,setAberto]=useState(false);
 return <><button type="button" className={botao} onClick={()=>setAberto(true)}>{titulo}</button>{aberto&&<Modal titulo={titulo} desfocarFundo onClose={()=>setAberto(false)}>{children}</Modal>}</>;
}
