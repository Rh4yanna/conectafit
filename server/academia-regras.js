import {erro} from './academia-core.js';
export function validarCPF(v){
 if(v==null||v==='')return null;
 if(typeof v!=='string'||!/^[\d.\-\s]+$/.test(v))throw erro('CPF inválido.');
 const cpf=v.replace(/\D/g,'');if(!cpf)return null;
 if(!/^\d{11}$/.test(cpf)||/^(\d)\1+$/.test(cpf))throw erro('CPF inválido.');
 for(let n=9;n<=10;n++){let soma=0;for(let i=0;i<n;i++)soma+=Number(cpf[i])*(n+1-i);const digito=(soma*10)%11%10;if(digito!==Number(cpf[n]))throw erro('CPF inválido.');}return cpf;
}
export function validarRegras(b){
 const original=b.regras_acesso||{};
 const dias=b.dias_semana===undefined?original.dias:b.dias_semana.trim()?b.dias_semana.split(',').map(v=>Number(v.trim())):[];
 const inicio=b.hora_inicio??original.inicio??'',fim=b.hora_fim??original.fim??'',limite=b.limite_diario??original.limite??'';
 if(dias!=null&&(!Array.isArray(dias)||dias.length>7||dias.some(v=>!Number.isInteger(v)||v<0||v>6)))throw erro('Dias permitidos: use números de 0 (domingo) a 6 (sábado), separados por vírgula.');
 if(Boolean(inicio)!==Boolean(fim)||inicio&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(fim)||inicio>=fim))throw erro('Informe início e fim válidos no mesmo dia, com início antes do fim.');
 if(limite!==''&&limite!=null&&(!/^\d+$/.test(String(limite))||Number(limite)<1||Number(limite)>100))throw erro('O limite diário deve ficar entre 1 e 100 entradas.');
 return {dias:[...new Set(dias||[])],inicio,fim,limite:limite===''||limite==null?null:Number(limite)};
}
export function motivoBloqueio(regras,diaSemana,hora,entradas){
 if(regras?.dias?.length&&!regras.dias.includes(diaSemana))return 'O plano contratado não permite entrada neste dia da semana.';
 if(regras?.inicio&&(hora<regras.inicio||hora>=regras.fim))return `O plano permite entradas das ${regras.inicio} às ${regras.fim}.`;
 if(regras?.limite&&entradas>=regras.limite)return 'O limite diário de entradas do plano foi atingido.';
 return null;
}
