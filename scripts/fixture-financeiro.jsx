import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '../src/context/ThemeContext';
import GestaoFinanceira from '../src/pages/academia/GestaoFinanceira';
import GestaoContasAcademia from '../src/pages/academia/GestaoContasAcademia';
import {hoje} from '../src/pages/academia/operacao-comum';
import '../src/index.css';
const data=hoje(),mes=data.slice(0,7)+'-01';
const movimentos=[{id:1,data,tipo:'receita',descricao:'Mensalidade Ana',categoria:'mensalidade',valor:'100.00',autor:'Gestora',estorno_de:null,estornado_por:null},{id:2,data,tipo:'despesa',descricao:'Limpeza',categoria:'outros',valor:'30.00',autor:'Gestora',estorno_de:null,estornado_por:null}];
const dados={matriculas:[{id:1,aluno_nome:'Ana Costa'}],mensalidades:[{id:1,matricula_id:1,aluno_nome:'Ana Costa',competencia:mes,vencimento:data,valor:'200.00',recebido:'100.00',desconto:'0.00',saldo:'100.00',status:'parcial'}],financeiro:{resumo:{previsto:'200.00',recebido:'100.00',pendente:'100.00',atrasado:'0.00'},lancamentos:movimentos}};
const api=async path=>path.startsWith('/contas-pagar?')?[{id:1,descricao:'Energia',fornecedor:'Empresa',categoria:'outros',vencimento:data,valor:'50.00',pago:'0.00',saldo:'50.00',status:'pendente',cancelada:false,versao:1,autor:'Gestora',repeticoes:1,pagamentos:[]}]:path.startsWith('/historico?')?[{id:1,criado_em:new Date().toISOString(),autor:'Gestora',acao:'criar',entidade:'conta',registro_id:1,motivo:'Cadastro',antes:null,depois:null}]:[];
function App(){const [aba,setAba]=useState('pagamentos'),[inicio,setInicio]=useState(mes),[fim,setFim]=useState(data);return <GestaoFinanceira aba={aba} navegar={setAba} dados={dados} api={api} salvar={async()=>({})} carregar={async()=>{}} inicio={inicio} fim={fim} setInicio={setInicio} setFim={setFim} filtro="todos" carregando={false} contas={<GestaoContasAcademia api={api} recarregar={async()=>{}}/>}/>;}
createRoot(document.getElementById('root')).render(<ThemeProvider><div style={{padding:12,background:'#0b1220',minHeight:'100vh'}}><App/></div></ThemeProvider>);
