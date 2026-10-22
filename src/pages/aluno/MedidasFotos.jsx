import AbasAluno from '../../components/aluno/AbasAluno';
import MensagemTemporaria from '../../components/MensagemTemporaria';
import { CompararMedidas,CompararFotos } from '../../components/evolucao/ComparacoesEvolucao';
import GraficosEvolucao from '../../components/evolucao/GraficosEvolucao';
import ComentariosEvolucao from '../../components/evolucao/ComentariosEvolucao';
import {useCallback,useEffect,useState} from 'react';
import {Camera,Ruler,Save,Trash2} from 'lucide-react';
import {apiFetch} from '../../config/api';
const campos=[['peso','Peso','kg',500],['altura','Altura','cm',300],['cintura','Cintura','cm',300],['quadril','Quadril','cm',300],['braco_direito','Braço direito','cm',150],['braco_esquerdo','Braço esquerdo','cm',150],['percentual_gordura','Gordura corporal','%',100]];
const posicoes=[['frente_url','Frente'],['costas_url','Costas'],['lado_esquerdo_url','Lado esquerdo'],['lado_direito_url','Lado direito']];
const hoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const dataTexto=value=>String(value).slice(0,10).split('-').reverse().join('/');
async function lerFoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if(file.size>15*1024*1024)throw new Error('A foto deve ter até 15 MB.');
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const escala=Math.min(1,1280/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*escala);canvas.height=Math.round(img.height*escala);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.8);
    if(data.length>900000)throw new Error('Escolha uma foto menor.');
    return data;
  }finally{URL.revokeObjectURL(url);}
}
export default function MedidasFotos(){
  const [aba,setAba]=useState('medidas');
  const [dados,setDados]=useState({medidas:[],fotos:[]});
  const [form,setForm]=useState({data_medicao:hoje()});
  const [fotos,setFotos]=useState({data_registro:hoje()});
  const [erro,setErro]=useState('');const [mensagem,setMensagem]=useState('');
  const [carregando,setCarregando]=useState(true);const [salvando,setSalvando]=useState('');const [processando,setProcessando]=useState(0);
  const carregar=useCallback(async()=>{const r=await apiFetch('/aluno/medidas');if(!r.ok)throw new Error('Não foi possível carregar sua evolução.');setDados(await r.json());},[]);
  useEffect(()=>{carregar().catch(e=>setErro(e.message)).finally(()=>setCarregando(false));},[carregar]);
  const salvar=async(e,tipo)=>{
    e.preventDefault();setErro('');setMensagem('');
    if(tipo==='medidas'&&!campos.some(([n])=>form[n]!==undefined&&form[n]!=='')){setErro('Preencha pelo menos uma medida.');return;}
    if(tipo==='fotos'&&!posicoes.some(([n])=>fotos[n])){setErro('Selecione pelo menos uma foto.');return;}
    setSalvando(tipo);
    try{const r=await apiFetch(`/aluno/${tipo}`,{method:'POST',body:JSON.stringify(tipo==='medidas'?form:fotos)});const d=await r.json();if(!r.ok)throw new Error(d.message);await carregar();if(tipo==='medidas')setForm({data_medicao:hoje()});else setFotos({data_registro:hoje()});setMensagem(tipo==='medidas'?'Medição salva.':'Fotos salvas.');}catch(e){setErro(e.message);}finally{setSalvando('');}
  };
  const selecionar=async(nome,file)=>{if(!file)return;setProcessando(v=>v+1);setErro('');try{const data=await lerFoto(file);setFotos(v=>({...v,[nome]:data}));}catch(e){setErro(e.message);}finally{setProcessando(v=>v-1);}};
  const input='w-full mt-1 bg-neutral-950 border border-neutral-700 rounded-xl p-3 outline-none focus:border-[#00AEFF]';
  const bloqueado=Boolean(salvando)||processando>0;
  return <main className="px-5 lg:px-10 py-8 space-y-6">
    <header><h1 className="text-2xl font-black flex gap-3 items-center"><Ruler className="text-[#00AEFF]"/>Medidas e fotos</h1><p className="text-sm text-neutral-400 mt-2">Acompanhe suas medidas corporais e registre fotos da sua evolução.</p></header>
    {erro&&<MensagemTemporaria as="p" role="alert" className="text-red-400 rounded-xl border border-red-500/30 p-3">{erro}</MensagemTemporaria>}{mensagem&&<MensagemTemporaria as="p" role="status" className="text-sky-500">{mensagem}</MensagemTemporaria>}
    <details className="border border-sky-500/40 rounded-2xl p-5"><summary className="cursor-pointer font-bold">Como manter registros consistentes</summary><ul className="list-disc pl-5 space-y-2 mt-3 text-sm"><li>Use as mesmas unidades, o mesmo instrumento e condições semelhantes. Registre diferenças de horário ou método nas observações.</li><li>Combine com seu profissional quais pontos do corpo medir e repita o mesmo procedimento. Não compare medições feitas por métodos diferentes como se fossem equivalentes.</li><li>Para fotos, mantenha posição, distância, iluminação e enquadramento semelhantes. Selecione a posição correta ao enviar.</li><li>Compare tendências ao longo do tempo. Um registro isolado não determina melhora ou piora.</li><li>Em Gerenciar conexões, autorize medidas e fotos separadamente. Os profissionais só podem consultar e comentar os dados que você compartilhou.</li></ul></details>
    <AbasAluno valor={aba} onChange={setAba} itens={[['medidas','Minhas medidas'],['fotos','Fotos de evolução'],['comparar','Comparar evolução'],['historico','Histórico']]}/><div hidden={aba!=='comparar'} className="space-y-6"><CompararMedidas medidas={dados.medidas}/>
    <CompararFotos fotos={dados.fotos}/>
    <GraficosEvolucao compacto atualizacao={dados.medidas.length}/></div>
    <div>
      <form hidden={aba!=='medidas'} onSubmit={e=>salvar(e,'medidas')} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><fieldset disabled={bloqueado} className="space-y-4"><h2 className="text-lg font-bold">Nova medição</h2><label className="block text-sm">Data<input required type="date" min="2000-01-01" max={hoje()} className={input} value={form.data_medicao} onChange={e=>setForm({...form,data_medicao:e.target.value})}/></label><div className="space-y-4">{[['Medidas gerais',['peso','altura']],['Circunferências',['cintura','quadril','braco_direito','braco_esquerdo']],['Composição corporal',['percentual_gordura']]].map(([grupo,chaves])=><fieldset key={grupo} className="border border-neutral-500/20 rounded-xl p-4"><legend className="px-2 font-semibold text-sm">{grupo}</legend><div className="grid sm:grid-cols-2 gap-3">{campos.filter(([n])=>chaves.includes(n)).map(([n,label,un,max])=><label key={n} className="text-sm">{label} ({un})<input type="number" min="0.1" max={max} step="0.1" className={input} value={form[n]??''} onChange={e=>setForm({...form,[n]:e.target.value})}/></label>)}</div></fieldset>)}</div><label className="block text-sm">Observações<textarea rows={2} maxLength={2000} className={input} value={form.observacoes||''} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label><button className="w-full bg-[#00AEFF] text-black rounded-xl py-3 font-bold flex justify-center gap-2"><Save className="w-5"/>{salvando==='medidas'?'Salvando...':'Salvar medidas'}</button></fieldset></form>
      <form hidden={aba!=='fotos'} onSubmit={e=>salvar(e,'fotos')} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><fieldset disabled={bloqueado} className="space-y-4"><h2 className="text-lg font-bold flex gap-2"><Camera/>Fotos do corpo</h2><label className="block text-sm">Data das fotos<input required type="date" min="2000-01-01" max={hoje()} className={input} value={fotos.data_registro} onChange={e=>setFotos({...fotos,data_registro:e.target.value})}/></label><div className="grid grid-cols-2 gap-4">{posicoes.map(([n,label])=><div key={n} className="space-y-2"><label className="text-sm font-bold">{label}<input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs mt-2 file:rounded-lg file:border-0 file:p-2 file:mr-2 file:bg-sky-500/10 file:text-sky-500" onChange={e=>{selecionar(n,e.target.files?.[0]);e.target.value='';}}/></label><div className="aspect-[3/4] max-h-52 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden">{fotos[n]?<img src={fotos[n]} alt={`Prévia: ${label}`} className="w-full h-full object-contain"/>:<Camera className="text-neutral-500"/>}</div>{fotos[n]&&<button type="button" className="text-red-400 text-xs flex gap-1" onClick={()=>setFotos(v=>({...v,[n]:null}))}><Trash2 className="w-3"/>Remover seleção</button>}</div>)}</div><p className="text-xs text-neutral-400">Frente, costas e laterais são opcionais. Fotos da mesma data completam ou substituem a posição enviada. O acesso dos profissionais é controlado em Gerenciar Conexões.</p><button className="w-full bg-sky-500 text-black rounded-xl py-3 font-bold">{processando?'Preparando foto...':salvando==='fotos'?'Salvando...':'Salvar fotos'}</button></fieldset></form>
    </div>
    <section hidden={aba!=='historico'} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><h2 className="text-lg font-bold mb-4">Histórico de medidas</h2>{carregando?<p>Carregando...</p>:!dados.medidas.length?<p className="text-sm text-neutral-400">Sua primeira medição aparecerá aqui.</p>:<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Data</th>{campos.map(([n,label,un])=><th key={n} className="p-3 whitespace-nowrap">{label} ({un})</th>)}<th>Observações</th></tr></thead><tbody>{dados.medidas.map(m=><tr key={m.id} className="border-t border-neutral-800"><td className="p-3 whitespace-nowrap">{dataTexto(m.data_medicao)}</td>{campos.map(([n])=><td key={n} className="p-3">{m[n]==null?'—':Number(m[n]).toLocaleString('pt-BR')}</td>)}<td className="p-3">{m.observacoes||'—'}</td></tr>)}</tbody></table></div>}</section>
    <section hidden={!['fotos','historico'].includes(aba)} className="space-y-4"><h2 className="text-lg font-bold">Histórico de fotos</h2>{!carregando&&!dados.fotos.length&&<p className="text-sm text-neutral-400">As fotos salvas aparecerão aqui, organizadas por data.</p>}{dados.fotos.map(g=><article key={g.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"><h3 className="font-bold mb-4">{dataTexto(g.data_registro)}</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{posicoes.filter(([n])=>g[n]).map(([n,label])=><figure key={n}><img src={g[n]} alt={`${label} em ${dataTexto(g.data_registro)}`} loading="lazy" className="w-full aspect-[3/4] rounded-xl object-contain bg-neutral-950"/><figcaption className="text-sm text-neutral-400 mt-2">{label}</figcaption></figure>)}</div></article>)}</section>
    <div hidden={aba!=='historico'}><ComentariosEvolucao/></div>
  </main>;
}
