import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '../src/context/ThemeContext';
import GestaoLeads from '../src/pages/academia/GestaoLeads';
import '../src/index.css';
let leads=[{id:1,nome:'Ana Costa',telefone:'42999999999',email:'ana@teste.invalid',origem:'Instagram',status:'novo',observacoes:'',versao:1,criado_em:new Date().toISOString(),interacoes:[],agendamentos:[],solicitacoes:[]}];
const api=async(path,method,body)=>{if(path==='/leads'&&!method)return structuredClone(leads);if(path==='/leads'&&method==='POST'){const l={...body,id:2,status:'novo',versao:1,criado_em:new Date().toISOString(),interacoes:[],agendamentos:[],solicitacoes:[]};leads=[l,...leads];return l;}if(path==='/leads/1'&&method==='PUT'){leads=leads.map(l=>l.id===1?{...l,...body,versao:l.versao+1}:l);return leads.find(l=>l.id===1);}if(path==='/leads/1/interacoes'){leads=leads.map(l=>l.id===1?{...l,interacoes:[{id:9,relato:body.relato,autor:'Gestora',criado_em:new Date().toISOString()},...l.interacoes]}:l);return {};}throw new Error('Ação não disponível no teste');};
createRoot(document.getElementById('root')).render(<ThemeProvider><div style={{padding:12,background:'#0b1220',minHeight:'100vh'}}><GestaoLeads api={api} matriculas={[]} recarregar={async()=>{}}/></div></ThemeProvider>);
