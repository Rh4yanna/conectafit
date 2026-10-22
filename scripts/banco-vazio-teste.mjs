import crypto from 'node:crypto';
import pg from 'pg';
import db from '../server/db.js';
import {configuracaoBanco} from '../server/configuracao-banco.js';
import {aplicarMigracoes} from '../server/migracoes.js';
export async function bancoVazioTeste(){
 if(process.env.NODE_ENV==='production')throw new Error('Testes isolados não podem usar ambiente de produção.');
 const schema=`teste_instalacao_${crypto.randomBytes(8).toString('hex')}`;
 await db.query(`CREATE SCHEMA ${schema}`);
 const pool=new pg.Pool({...configuracaoBanco(process.env),options:`-c search_path=${schema}`});
 const fechar=async()=>{await pool.end();await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end();};
 try {await aplicarMigracoes(pool,{log:()=>{}});return {db:pool,schema,fechar};}catch(e){await fechar();throw e;}
}
