import pg from 'pg';
import dotenv from 'dotenv';
import {configuracaoBanco} from './configuracao-banco.js';
dotenv.config({quiet:true});
const pool=new pg.Pool(configuracaoBanco(process.env));
pool.on('error',error=>console.error('Conexão com PostgreSQL interrompida:',error.code||'erro de conexão'));
export default pool;
