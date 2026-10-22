/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Building2, UserRound } from 'lucide-react';
import { fotoPublica } from '../../utils/contatosPublicos';
export default function FotoServico({src,nome,academia=false,className=''}) {
  const [falhou,setFalhou]=useState(null),url=fotoPublica(src),Icon=academia?Building2:UserRound;
  return <div className={`relative overflow-hidden bg-sky-500/10 flex items-center justify-center ${className}`}>
    <Icon className="w-14 h-14 text-sky-500" aria-hidden="true"/>
    {url&&falhou!==url&&<img src={url} alt={nome} loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={()=>setFalhou(url)}/>}
  </div>;
}
