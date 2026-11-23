import {createRoot} from 'react-dom/client';
import EquipeAcademia from '../src/pages/academia/EquipeAcademia';
import {ThemeProvider} from '../src/context/ThemeContext';
import '../src/index.css';
let funcionarios=[],turnos={};
const api=async(p,m,b)=>{if(p==='/funcionarios'&&!m)return {funcionarios,turnos,equipe_existente:[]};if(p==='/funcionarios'&&m==='POST'){funcionarios=[{...b,id:1,ativo:true,versao:1,equipe_id:null}];return {id:1};}if(p.endsWith('/convite'))return {token:'a'.repeat(64)};if(p.endsWith('/situacao')){funcionarios=funcionarios.map(f=>({...f,ativo:b.ativo,versao:f.versao+1}));return {};}if(p==='/funcionarios/turnos'){turnos=b;return {};}if(p.startsWith('/historico'))return [];throw Error('Operação indisponível');};
createRoot(document.getElementById('root')).render(<ThemeProvider><div style={{padding:12,background:'#0b1220',minHeight:'100vh'}}><EquipeAcademia api={api} titular/></div></ThemeProvider>);
