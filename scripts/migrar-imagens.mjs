// Prévia por padrão. Nunca busca URLs externas nem altera valores sem comparação.
import db from '../server/db.js';
import {storageFirebase} from '../server/firebase-storage.js';
import {gravarImagem} from '../server/imagens-storage.js';
export const fontesImagens=[
 {t:'usuarios',d:'id',campos:['foto_url'],fim:'perfil'},
 {t:'perfis_personal',d:'usuario_id',campos:['foto_perfil'],fim:'perfil'},
 {t:'perfis_nutri',d:'usuario_id',campos:['foto_perfil'],fim:'perfil'},
 {t:'perfis_academia',d:'usuario_id',campos:['foto_perfil'],fim:'perfil'},
 {t:'fotos_academia',d:'(SELECT usuario_id FROM perfis_academia WHERE id=f.academia_id)',campos:['foto_url'],fim:'galeria'},
 {t:'fotos_evolucao',d:'aluno_id',campos:['frente_url','costas_url','lado_esquerdo_url','lado_direito_url'],fim:'evolucao'},
 {t:'diario_alimentar',d:'aluno_id',campos:['foto'],fim:'refeicao'},
];
const aplicar=process.argv.includes('--apply');
try {
 if(aplicar&&process.env.MAINTENANCE_MODE!=='true')throw new Error('Pare a API e configure MAINTENANCE_MODE=true antes de aplicar.');
 if(aplicar&&process.env.NODE_ENV==='production'&&!process.argv.includes('--production-approved'))throw new Error('Produção exige aprovação prévia e --production-approved.');
 const storage=aplicar?storageFirebase():null;
 if(aplicar&&!storage)throw new Error('Configure Firebase no servidor antes de aplicar.');
 for(const fonte of fontesImagens)for(const campo of fonte.campos){
  let ultimo=0,encontradas=0,migradas=0,falhas=0;
  while(true){
   const rows=(await db.query(`SELECT f.id,${fonte.d} AS dono,${campo} AS imagem FROM ${fonte.t} f WHERE f.id>$1 AND ${campo} LIKE 'data:image/%' ORDER BY f.id LIMIT 25`,[ultimo])).rows;
   if(!rows.length)break;
   for(const row of rows){ultimo=row.id;encontradas++;if(!aplicar)continue;
    try{if(!row.dono)throw new Error('Sem proprietário');const ref=await gravarImagem(db,storage,{id:row.dono},row.dono,fonte.fim,row.imagem);const r=await db.query(`UPDATE ${fonte.t} SET ${campo}=$1 WHERE id=$2 AND ${campo}=$3`,[ref,row.id,row.imagem]);migradas+=r.rowCount;}
    catch {falhas++;}
   }
  }
  console.log(JSON.stringify({tabela:fonte.t,campo,encontradas,migradas,falhas,modo:aplicar?'aplicacao':'previa'}));
  if(falhas)process.exitCode=1;
 }
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.end();}
