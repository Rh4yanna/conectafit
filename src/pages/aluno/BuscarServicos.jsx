import MensagemTemporaria from '../../components/MensagemTemporaria';
import ContatosServico from '../../components/servicos/ContatosServico';
import FotoServico from '../../components/servicos/FotoServico';
import {enderecoPublico} from '../../utils/contatosPublicos';
import {MapPin} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {apiFetch} from '../../config/api';
import {useTheme} from '../../context/ThemeContext';
import {mensagemErroGps,calcularDistancia,coordenadasValidas} from '../../utils/localizacao';
import PerfilServico,{ComparacaoServicos} from '../../components/servicos/PerfilServico';
import {PedirVisita} from '../../components/servicos/SolicitacoesVisita';
import {busca,dias,moeda,campo,botao,painel,tipos,periodos} from '../../components/servicos/comum';
const vazio={busca:'',cidade:'',tipo:'',especialidade:'',objetivo:'',modalidade:'',atendimento:'',periodo:'mensal',preco_max:'',dia:'',horario:'',novos:false};
export default function BuscarServicos(){
 const {temaEscuro}=useTheme(),[filtros,setFiltros]=useState(vazio),[aplicados,setAplicados]=useState(vazio),[dados,setDados]=useState({servicos:[],filtros:{}}),[carregando,setCarregando]=useState(true),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState(''),[coords,setCoords]=useState(null),[gps,setGps]=useState(''),[ordem,setOrdem]=useState('nome'),[selecionados,setSelecionados]=useState([]),[comparar,setComparar]=useState(false),[perfil,setPerfil]=useState(null),[visita,setVisita]=useState(null),[ocupado,setOcupado]=useState(false),[conexoes,setConexoes]=useState([]);
 const distancias=Object.fromEntries(dados.servicos.filter(s=>s.tipo==='academia').map(s=>[s.id,coords?calcularDistancia(coords.lat,coords.lng,s.lat,s.lng):null]));
 const pararGps=useRef(null);
 const [calculando,setCalculando]=useState(false);
 const rotaAtual=useRef(0);
 useEffect(()=>()=>{rotaAtual.current++;},[]);
 useEffect(()=>()=>pararGps.current?.(),[]);
 useEffect(()=>{let atual=true;setCarregando(true);setErro('');const query=new URLSearchParams(Object.entries(aplicados).filter(([,v])=>v!==''&&v!==false));busca(`/catalogo?${query}`).then(d=>{if(atual)setDados(d);}).catch(e=>{if(atual)setErro(e.message);}).finally(()=>{if(atual)setCarregando(false);});return()=>{atual=false;};},[aplicados]);
 const carregarConexoes=async()=>{const r=await apiFetch('/conexoes/minhas');if(!r.ok)throw new Error('Não foi possível consultar as conexões.');setConexoes(await r.json());};
 useEffect(()=>{carregarConexoes().catch(e=>setErro(e.message));},[]);
 const alterar=(k,v)=>setFiltros(f=>({...f,[k]:v,...(k==='dia'&&v===''?{horario:''}:{})}));
 const localizar=async()=>{
  ++rotaAtual.current;
  setCoords(null);setCalculando(false);
  pararGps.current?.();
  if(!window.isSecureContext){setGps('Para acessar a localização, abra o site em HTTPS ou use localhost no computador. HTTP pelo endereço de rede não permite esse acesso.');return;}
  if(!navigator.geolocation){setGps('Localização não disponível neste navegador.');return;}
  setGps('Obtendo localização...');
  let ativa=true;
  const cancelar=()=>{ativa=false;clearTimeout(limite);};
  const limite=setTimeout(()=>{if(!ativa)return;cancelar();setGps('A localização não respondeu. Confira a permissão do navegador e a localização do dispositivo, depois tente novamente.');},15000);
  pararGps.current=cancelar;
  try{
   navigator.geolocation.getCurrentPosition(async p=>{
    if(!ativa)return;cancelar();
    const origem={lat:p.coords.latitude,lng:p.coords.longitude};
    if(!coordenadasValidas(origem.lat,origem.lng)){setGps('O dispositivo retornou uma posição inválida. Tente atualizar a localização.');return;}
    setCoords(origem);setOrdem('distancia');setCalculando(false);
    setGps('Distâncias aproximadas em linha reta. Academias sem coordenadas cadastradas ficam sem distância.');
   },e=>{if(!ativa)return;cancelar();setGps(mensagemErroGps(e));},{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }catch{cancelar();setGps('O navegador não permitiu consultar a localização. Confira as permissões deste site.');}
 };
 const distancia=s=>s.tipo==='academia'?(distancias[s.id]??null):null;
 const lista=[...dados.servicos].sort((a,b)=>{if(ordem==='distancia')return (distancia(a)??Infinity)-(distancia(b)??Infinity)||a.nome.localeCompare(b.nome);if(ordem==='preco')return (a[`preco_${aplicados.periodo}`]==null?Infinity:Number(a[`preco_${aplicados.periodo}`]))-(b[`preco_${aplicados.periodo}`]==null?Infinity:Number(b[`preco_${aplicados.periodo}`]))||a.nome.localeCompare(b.nome);return a.nome.localeCompare(b.nome,'pt-BR');});
 const abrir=async s=>{setOcupado(true);setErro('');setMensagem('');try{setPerfil(await busca(`/perfil/${s.tipo}/${s.id}`));}catch(e){setErro(e.message);}finally{setOcupado(false);}};
 const conectar=async(interesse)=>{setOcupado(true);setErro('');setMensagem('');try{const r=await apiFetch('/conexoes',{method:'POST',body:JSON.stringify({tipo:perfil.tipo,profissional_id:perfil.id,interesse}),signal:AbortSignal.timeout(15000)});const b=await r.json();if(!r.ok)throw new Error(b.message);await carregarConexoes();setMensagem(b.existente?'Você já possui uma solicitação ou conexão com este profissional.':'Solicitação enviada. Após o aceite, autorize o compartilhamento em Gerenciar conexões.');}catch(e){setErro(e.message);}finally{setOcupado(false);}};
 const conexao=perfil&&conexoes.find(c=>String(c.profissional_id)===perfil.id&&c.tipo===perfil.tipo);
 const selecionar=(s,checked)=>{setErro('');if(checked&&selecionados.length===3){setErro('Compare até três perfis por vez.');return;}setSelecionados(v=>checked?[...v,s]:v.filter(p=>p.id!==s.id));};
 return <main className="p-5 lg:p-10 space-y-6">
  <header><h1 className="text-3xl font-bold">Encontre profissionais e academias</h1><p className="mt-2">Compare profissionais e academias com base no que você precisa.</p></header>
  <form className={painel} onSubmit={e=>{e.preventDefault();setAplicados({...filtros});}}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
   <label>Busca por nome ou serviço<input className={campo} value={filtros.busca} onChange={e=>alterar('busca',e.target.value)}/></label><label>Cidade<input className={campo} placeholder="Todas as cidades" value={filtros.cidade} onChange={e=>alterar('cidade',e.target.value)}/></label>
   <label>Categoria<select aria-label="Categoria" className={campo} value={filtros.tipo} onChange={e=>alterar('tipo',e.target.value)}><option value="">Todas</option>{Object.entries(tipos).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  </div><details className="border-t border-neutral-500/20 pt-3"><summary className="cursor-pointer font-semibold text-sm">Filtro avançado</summary><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
   { [['especialidade','Especialidade','especialidades'],['objetivo','Objetivo','objetivos'],['modalidade','Modalidade','modalidades']].map(([k,l,opcoes])=><label key={k}>{l}<select aria-label={l} className={campo} value={filtros[k]} onChange={e=>alterar(k,e.target.value)}><option value="">Todas as opções</option>{(dados.filtros[opcoes]||[]).map(v=><option key={v}>{v}</option>)}</select></label>) }
   <label>Forma de atendimento<select aria-label="Forma de atendimento" className={campo} value={filtros.atendimento} onChange={e=>alterar('atendimento',e.target.value)}><option value="">Todas</option><option value="presencial">Presencial</option><option value="online">Online</option><option value="domicilio">Em domicílio</option></select></label>
   <label>Período do preço<select aria-label="Período do preço" className={campo} value={filtros.periodo} onChange={e=>alterar('periodo',e.target.value)}>{Object.entries(periodos).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><label>Preço máximo (R$)<input className={campo} type="number" min="0" max="1000000" step="0.01" value={filtros.preco_max} onChange={e=>alterar('preco_max',e.target.value)}/></label>
   <label>Dia de atendimento<select aria-label="Dia de atendimento" className={campo} value={filtros.dia} onChange={e=>alterar('dia',e.target.value)}><option value="">Qualquer dia</option>{dias.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label><label>Horário de atendimento<input className={campo} type="time" disabled={filtros.dia===''} value={filtros.horario} onChange={e=>alterar('horario',e.target.value)}/></label><label className="self-center"><input type="checkbox" checked={filtros.novos} onChange={e=>alterar('novos',e.target.checked)}/> Aceitando novos alunos</label>
  </div><p className="text-sm">Horários informados pelos prestadores, no horário de Brasília. Não garantem uma vaga. Perfis sem o dado solicitado ficam fora do filtro.</p></details><div className="flex flex-wrap gap-3"><button className={botao+' bg-sky-600 text-white'} disabled={carregando}>Aplicar filtros</button><button type="button" className={botao} onClick={()=>{setFiltros(vazio);setAplicados({...vazio});}}>Limpar filtros</button></div></form>
  {erro&&!perfil&&<MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}<div className="flex flex-wrap items-center justify-between gap-3"><p role="status">{carregando?'Buscando serviços...':`${lista.length} resultado(s)`}</p><div className="flex flex-wrap items-center gap-3 sm:ml-auto"><label>Ordenar por <select className={campo+' !w-auto'} value={ordem} onChange={e=>setOrdem(e.target.value)}><option value="nome">Nome</option><option value="preco">Menor preço • {periodos[aplicados.periodo]}</option><option value="distancia" disabled={!Object.keys(distancias).length}>Distância das academias</option></select></label>{dados.servicos.some(s=>s.tipo==='academia')&&<button type="button" className={botao+' inline-flex items-center justify-center gap-2 bg-sky-600 text-white font-semibold'} onClick={localizar} disabled={calculando||gps==='Obtendo localização...'}><MapPin size={18} aria-hidden="true"/>{gps==='Obtendo localização...'?'Localizando...':coords?'Atualizar localização':'Ativar localização'}</button>}</div></div>
  {gps&&!coords&&gps!=='Obtendo localização...'&&<MensagemTemporaria as="p" role="status">{gps}</MensagemTemporaria>}
  {selecionados.length>0&&<aside className={painel}><p>Selecionados: {selecionados.map(s=>s.nome).join(', ')}</p><div className="flex gap-3"><button className={botao} disabled={selecionados.length<2} onClick={()=>setComparar(true)}>Comparar perfis ({selecionados.length}/3)</button><button className="acao-secundaria" onClick={()=>setSelecionados([])}>Limpar seleção</button></div></aside>}
  {!carregando&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{lista.map(s=><article key={s.id} className={`rounded-2xl border border-neutral-500/30 p-4 flex flex-col gap-3 min-w-0 ${temaEscuro?'bg-neutral-900':'bg-white'}`}>
   <FotoServico src={s.foto} nome={s.nome} academia={s.tipo==='academia'} className="aspect-[3/2] rounded-xl"/>
   <div className="space-y-1 min-w-0">
    <p className="text-xs text-sky-500 font-semibold">{tipos[s.tipo]}</p>
    <div className="flex items-start justify-between gap-2">
     <h2 className="text-base font-bold break-words min-w-0 flex-1">{s.nome}</h2>
     {s.tipo==='academia'&&<span className="shrink-0 max-w-[45%] text-xs border border-neutral-500/30 rounded-lg p-2" title={distancia(s)!=null?'Distância aproximada em linha reta':coords?'A academia precisa cadastrar sua latitude e longitude.':'Permita acessar sua localização para calcular a distância.'}>
      <span className="flex items-start gap-1"><MapPin size={14} className="shrink-0" aria-hidden="true"/>{distancia(s)!=null?`${distancia(s).toFixed(1)} km aprox.`:coords?'Distância indisponível':'Ative a localização'}</span>
      {distancia(s)!=null&&<span className="block mt-1">Em linha reta</span>}
     </span>}
    </div>
    {s.especialidades?.length>0&&<p className="text-sm font-semibold text-sky-500">{s.especialidades.join(' · ')}</p>}
    {s.tipo!=='academia'&&s.cidade&&<p className="text-sm">{s.cidade}</p>}
   </div>
   {s.tipo==='academia'&&enderecoPublico(s)&&<p className="text-sm leading-relaxed">{enderecoPublico(s)}</p>}
   {(s.preco_diaria!=null||s.preco_mensal!=null)&&<dl className="grid grid-cols-2 gap-3 border-t border-neutral-500/20 pt-3">{[['diaria','Diária'],['mensal','Mensal']].map(([k,l])=>s[`preco_${k}`]!=null&&s[`preco_${k}`]!==''&&<div key={k}><dt className="text-xs">{l}</dt><dd className="font-semibold">{moeda(s[`preco_${k}`])}</dd></div>)}</dl>}
   {s.tipo==='academia'&&s.estrutura?.ambientes?.trim()&&<div><p className="text-sm font-semibold">Estrutura</p><p className="text-sm line-clamp-2 mt-1">{s.estrutura.ambientes}</p></div>}
   <div className="mt-auto flex flex-col gap-3">
   <ContatosServico perfil={s}/>
   <button className={botao+' w-full bg-sky-600 text-white font-semibold'} disabled={ocupado} onClick={()=>abrir(s)}>Ver mais</button>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selecionados.some(p=>p.id===s.id)} onChange={e=>selecionar(s,e.target.checked)}/> Comparar<span className="sr-only"> {s.nome}</span></label>
   </div>
  </article>)}{!lista.length&&<p>Nenhum perfil atende aos filtros. Tente ampliar sua busca.</p>}</div>}
  {comparar&&<ComparacaoServicos selecionados={selecionados} periodo={aplicados.periodo} distancia={distancia} onClose={()=>setComparar(false)}/>}
  {perfil&&!visita&&<PerfilServico perfil={perfil} distancia={distancia(perfil)} conexao={conexao} ocupado={ocupado} erro={erro} mensagem={mensagem} conectar={conectar} visitar={setVisita} onClose={()=>{setPerfil(null);setErro('');}}/>}
  {visita&&perfil&&<PedirVisita perfil={perfil} tipo={visita} onClose={()=>{setVisita(null);setPerfil(null);}}/>}
 </main>;
}
