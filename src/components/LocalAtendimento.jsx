import {mensagemErroGps} from '../utils/localizacao';
import MensagemTemporaria from './MensagemTemporaria';
/* eslint-disable react/prop-types */
import {useEffect,useState} from 'react';
import {apiFetch} from '../config/api';

export default function LocalAtendimento({cidadeInicial = '', ruaInicial = '', onEnderecoSalvo, academia=false}) {
  const [resultados,setResultados]=useState(null);
  const [form,setForm] = useState(null);
  const [mensagem,setMensagem] = useState('');
  const [carregando,setCarregando] = useState(true);
  const [localizando,setLocalizando]=useState(false);
  const [salvando,setSalvando] = useState(false);
  const endereco = form || {cidade:cidadeInicial || '', rua:ruaInicial || '', numero:'', estado:''};

  useEffect(() => {
    apiFetch('/servico/localizacao').then(async r => {
      if (!r.ok) throw new Error('Não foi possível carregar o endereço.');
      const d = await r.json();
      if (d) setForm({cidade:d.cidade||'', rua:d.rua||'', numero:d.numero||'', estado:d.estado||'',latitude:d.latitude??'',longitude:d.longitude??''});
    }).catch(e => setMensagem(e.message)).finally(() => setCarregando(false));
  }, []);

  const salvar = async e => {
    e.preventDefault();
    setMensagem('');setSalvando(true);
    if(academia&&(endereco.latitude==null||endereco.latitude==='')){
      try{
        const r=await apiFetch('/servico/localizacao/buscar',{method:'POST',body:JSON.stringify(endereco),signal:AbortSignal.timeout(15000)});
        const d=await r.json();if(!r.ok)throw new Error(d.message);
        setResultados(d.resultados);
        if(!d.resultados.length)setMensagem('Não encontramos o estabelecimento com precisão. Confira o endereço ou use sua localização estando na academia.');
      }catch(e){setMensagem(e.message);}
      finally{setSalvando(false);}
      return;
    }
    try {
      const r = await apiFetch('/servico/localizacao',{method:'PUT',body:JSON.stringify(endereco)});
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setForm({cidade:d.cidade,rua:d.rua,numero:d.numero,estado:d.estado,latitude:d.latitude??'',longitude:d.longitude??''});
      onEnderecoSalvo?.(d);
      setMensagem(d.message);
    } catch(e) { setMensagem(e.message); }
    finally { setSalvando(false); }
  };

  return <form onSubmit={salvar} className="my-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
    <h3 className="font-bold text-lg">Endereço de atendimento</h3>
    <fieldset disabled={carregando||salvando||localizando} className="grid sm:grid-cols-2 gap-4">
      {[['cidade','Cidade',120],['estado','UF',2],['rua','Rua',180],['numero','Número ou s/n',20]].map(([campo,label,max]) =>
        <label key={campo} className="text-sm">{label}<input required maxLength={max} value={endereco[campo]}
          onChange={e => {setResultados(null);setForm({...endereco,[campo]:e.target.value,latitude:'',longitude:''});}}
          className="mt-1 block w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3"/></label>)}
      {academia&&<div className="sm:col-span-2 space-y-3">
        <p className="text-sm">Preencha o endereço e clique em Buscar endereço. Confira o resultado antes de salvar. Se não encontrar, use sua localização estando na academia.</p>
        <button type="button" className="acao-secundaria" onClick={()=>{
          if(!navigator.geolocation||!window.isSecureContext){setMensagem('A localização exige HTTPS ou localhost e um navegador compatível.');return;}
          setLocalizando(true);setMensagem('');
          navigator.geolocation.getCurrentPosition(p=>{setForm({...endereco,latitude:p.coords.latitude,longitude:p.coords.longitude});setLocalizando(false);setMensagem('Posição obtida. Confira e clique em Salvar endereço.');},e=>{setLocalizando(false);setMensagem(mensagemErroGps(e));},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
        }}>{localizando?'Obtendo posição...':'Usar minha localização na academia'}</button>
        {endereco.latitude!==''&&endereco.latitude!=null&&<p className="text-sm">Localização definida. Clique em Salvar endereço para confirmar.</p>}
        {resultados?.length>0&&<fieldset className="space-y-2"><legend className="font-semibold">Confirme o endereço encontrado</legend>{resultados.map((r,i)=><label className="flex items-start gap-2 border rounded-xl p-3" key={i}><input type="radio" name="endereco-encontrado" checked={endereco.latitude===r.latitude&&endereco.longitude===r.longitude} onChange={()=>setForm({...endereco,latitude:r.latitude,longitude:r.longitude})}/>{r.endereco}</label>)}</fieldset>}
        <p className="text-xs">Busca de endereços: <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Powered by Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap contributors</a></p>
      </div>}
      <button className="sm:col-span-2 rounded-xl py-3 bg-[#00AEFF] font-bold text-black">{salvando?'Aguarde...':academia&&(endereco.latitude==null||endereco.latitude==='')?'Buscar endereço':'Salvar endereço'}</button>
    </fieldset>
    {mensagem&&<MensagemTemporaria as="p" role="status" className="text-sm text-[#00AEFF]">{mensagem}</MensagemTemporaria>}
  </form>;
}
