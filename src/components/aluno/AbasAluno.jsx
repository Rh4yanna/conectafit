/* eslint-disable react/prop-types */
export default function AbasAluno({itens,valor,onChange,distribuir=false}) {
  return <nav aria-label="Áreas desta página" className="flex flex-wrap gap-2 rounded-2xl border border-neutral-500/20 p-2">{itens.map(([id,nome,Icone])=><button key={id} type="button" aria-pressed={valor===id} onClick={()=>onChange(id)} className={`min-h-11 ${distribuir?'flex-1 flex items-center justify-center gap-2 px-3':'px-4'} rounded-xl py-2 text-sm font-semibold transition-colors ${valor===id?'bg-sky-600 text-white':'hover:bg-neutral-500/10'}`}>{Icone&&<Icone size={17} aria-hidden="true"/>}{nome}</button>)}</nav>;
}
