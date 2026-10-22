import {applicationDefault, cert, getApps, initializeApp} from 'firebase-admin/app';
import {getStorage} from 'firebase-admin/storage';

export function storageFirebase(env=process.env) {
 if(env.IMAGE_STORAGE !== 'firebase') return null;
 if(!env.FIREBASE_STORAGE_BUCKET) throw new Error('Defina FIREBASE_STORAGE_BUCKET no servidor.');
 // Credencial somente no backend, via arquivo secreto/ADC ou variável protegida.
 let credential;
 try {credential=env.FIREBASE_SERVICE_ACCOUNT_JSON?cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)):applicationDefault();}
 catch {throw new Error('Credencial Firebase inválida. Confira o gerenciador de segredos.');}
 const app=getApps().find(a=>a.name==='conectafit-storage') || initializeApp({credential,storageBucket:env.FIREBASE_STORAGE_BUCKET},'conectafit-storage');
 const bucket=getStorage(app).bucket();
 return {
  bucket:bucket.name,
  async salvar(caminho,buffer,mime) {await bucket.file(caminho).save(buffer,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});},
  async ler(caminho) {return (await bucket.file(caminho).download())[0];},
  async excluir(caminho) {await bucket.file(caminho).delete({ignoreNotFound:true});},
 };
}
