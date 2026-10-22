import db from '../server/db.js';
import {storageFirebase} from '../server/firebase-storage.js';
import {imagemReferenciada} from '../server/imagens-storage.js';
const aplicar=process.argv.includes('--apply');
try{
 // Manutenção evita corrida entre checagem de referência e salvamento de formulário.
 if(aplicar&&process.env.MAINTENANCE_MODE!=='true')throw new Error('Pare todas as instâncias da API e defina MAINTENANCE_MODE=true.');
 if(aplicar&&process.env.NODE_ENV==='production'&&!process.argv.includes('--production-approved'))throw new Error('Produção exige aprovação e --production-approved.');
 const storage=aplicar?storageFirebase():null;
 if(aplicar&&!storage)throw new Error('Firebase não configurado.');
 let candidatos=0,excluidos=0,ultimo=null;
 while(true){
  const rows=(await db.query("SELECT * FROM imagens_storage WHERE estado<>'excluida' AND criada_em<NOW()-INTERVAL '30 days' AND ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT 100",[ultimo])).rows;
  if(!rows.length)break;
  for(const item of rows){ultimo=item.id;if(await imagemReferenciada(db,item))continue;candidatos++;
   if(aplicar){if(item.bucket!==storage.bucket)throw new Error('Bucket divergente; interrompendo sem excluir este objeto.');await storage.excluir(item.caminho);await db.query("UPDATE imagens_storage SET estado='excluida' WHERE id=$1",[item.id]);excluidos++;}
  }
 }
 console.log(JSON.stringify({modo:aplicar?'aplicacao':'previa',candidatos,excluidos}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.end();}
