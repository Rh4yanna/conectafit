import MensagemTemporaria from './MensagemTemporaria';
/* eslint-disable react/prop-types */
import { useState } from 'react';
import { apiFetch } from '../config/api';

export default function DemonstracaoExercicio(props) {
  return <ConteudoDemonstracao key={props.catalogoId || props.dados?.id || 'vazio'} {...props}/>;
}

function ConteudoDemonstracao({ catalogoId, dados }) {
  const [aberto, setAberto] = useState(false);
  const [item, setItem] = useState(dados || null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [video, setVideo] = useState(false);
  const [falhaVideo, setFalhaVideo] = useState(false);
  if (!catalogoId && !dados) return <p role="status" className="text-sm">Vídeo pendente. O autor da ficha precisa vincular a demonstração deste exercício.</p>;
  const abrir = async () => {
    setAberto(!aberto); setErro('');
    if (aberto || item) return;
    setCarregando(true);
    try { const r = await apiFetch(`/exercicios/${encodeURIComponent(catalogoId)}`); if (!r.ok) throw new Error(); setItem(await r.json()); }
    catch { setErro('Não foi possível carregar a demonstração. Feche e tente novamente.'); }
    finally { setCarregando(false); }
  };
  const midia = item?.videos?.find(v => v.codec === 'h264' && /\.mp4$/i.test(v.url)) || item?.videos?.find(v => v.codec === 'h264') || item?.videos?.[0];
  return <div className="border border-neutral-500/25 rounded-xl p-3 space-y-3">
    <button type="button" className="text-sky-500 font-semibold acao-secundaria" aria-expanded={aberto} onClick={abrir}>{aberto ? 'Ocultar demonstração' : 'Ver vídeo de execução'}</button>
    {aberto && <div className="space-y-3">
      {carregando && <p role="status">Carregando exercício...</p>}{erro && <MensagemTemporaria as="p" role="alert">{erro}</MensagemTemporaria>}
      {item && <>
        {item.indisponivel&&<p role="status">Este exercício foi retirado do catálogo do fornecedor. O autor da ficha precisa revisar o vídeo vinculado.</p>}
        <p className="font-bold">{item.nome}</p><p className="text-sm">{item.grupo} · {item.equipamentos.join(', ') || 'Equipamento não informado'} · Conteúdo em {item.idioma === 'pt' ? 'português' : 'inglês'}</p>
        {midia ? <>
          {!video ? <button type="button" className="border rounded-lg px-3 py-2" onClick={() => setVideo(true)}>Carregar vídeo</button> : <video aria-label={`Demonstração de ${item.nome}`} controls playsInline preload="metadata" className="w-full max-h-80 rounded-lg bg-black" onError={() => setFalhaVideo(true)}><source src={midia.url} type={midia.codec === 'h264' ? 'video/mp4' : undefined} onError={() => setFalhaVideo(true)}/>Seu navegador não reproduz este vídeo.</video>}
          {falhaVideo && <MensagemTemporaria as="p" role="alert">Vídeo indisponível ou incompatível com este navegador. Tente novamente ou informe o responsável pela ficha. <button className="acao-secundaria" onClick={()=>{setVideo(false);setFalhaVideo(false);}}>Tentar carregar novamente</button></MensagemTemporaria>}
          <p className="text-xs break-words">Vídeo: {midia.autores} · <a className="acao-secundaria" href={midia.licenca.url} target="_blank" rel="noreferrer">{midia.licenca.nome}</a> · <a className="acao-secundaria" href={midia.url} target="_blank" rel="noreferrer">Abrir original</a></p>
        </> : <p className="text-sm">Vídeo pendente. O autor precisa vincular um vídeo correspondente a este exercício.</p>}
        <p className="text-xs">Use a demonstração como referência junto às orientações do seu profissional.</p>
      </>}
    </div>}
  </div>;
}
