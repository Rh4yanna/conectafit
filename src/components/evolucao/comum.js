import { apiFetch } from '../../config/api';
export { hoje,dataBR } from '../alimentacao/comum';
export async function evolucao(path,method='GET',body){
  let r;try{r=await apiFetch(`/evolucao${path}`,{method,signal:AbortSignal.timeout(30000),...(body?{body:JSON.stringify(body)}:{})});}catch{throw new Error('Não foi possível conectar. Tente novamente; os valores digitados continuam na tela.');}
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível completar a operação.');return d;
}
export const indicadores={treinos:['Treinos concluídos','sessões',10000],refeicoes:['Refeições realizadas','refeições',10000],agua_ml:['Água registrada','ml',10000000],peso:['Peso','kg',500],cintura:['Cintura','cm',300],quadril:['Quadril','cm',300],braco_direito:['Braço direito','cm',150],braco_esquerdo:['Braço esquerdo','cm',150],percentual_gordura:['Gordura corporal','%',100]};
export const corporal=k=>!['treinos','refeicoes','agua_ml'].includes(k);
export const nomesAlvos={medida:'Medição',foto:'Fotos',objetivo:'Meta com prazo',metas:'Referências numéricas'};
export const numero=v=>v==null?'Sem registro':Number(v).toLocaleString('pt-BR');
export const nomesMetas={agua_litros:'Água por dia (L)',treinos_semana:'Treinos por semana',refeicoes_semana:'Refeições por semana',peso_meta:'Peso de referência (kg)',cintura_meta:'Cintura de referência (cm)',braco_meta:'Braço de referência (cm)',quadril_meta:'Quadril de referência (cm)',percentual_gordura_meta:'Gordura corporal de referência (%)'};
