import db from './db.js';
import {aplicarMigracoes} from './migracoes.js';
try {await aplicarMigracoes(db);}
catch(e) {console.error(e.message); process.exitCode=1;}
finally {await db.end();}
