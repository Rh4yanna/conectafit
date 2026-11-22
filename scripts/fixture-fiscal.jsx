import {createRoot} from 'react-dom/client';
import FiscalAcademia from '../src/pages/academia/FiscalAcademia';
import '../src/index.css';
let config={},documentos=[];
const api=async(p,m,b)=>{if(p==='/fiscal'&&!m)return {config,documentos,integracao:{mensagem:'Nenhum provedor fiscal integrado.'}};if(p==='/fiscal/configuracao'){config=b;return b;}if(p==='/fiscal/rascunhos'){const d={id:1,status:'rascunho',dados:b,criado_em:new Date().toISOString()};documentos=[d];return d;}if(p.startsWith('/fiscal/documentos/'))return {documento:documentos[0],eventos:[{autor:'Gestora',descricao:'Solicitação preparada',criado_em:new Date().toISOString()}]};throw Error('Operação indisponível');};
createRoot(document.getElementById('root')).render(<div style={{padding:12,background:'#0b1220',minHeight:'100vh'}}><FiscalAcademia api={api} mensalidades={[]} matriculas={[]}/></div>);
