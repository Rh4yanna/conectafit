import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const requiredVariables = ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASSWORD"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Configuração do banco incompleta: defina ${missingVariables.join(", ")} no arquivo .env.`);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log(' Conectado ao PostgreSQL!');
});

export default pool;
