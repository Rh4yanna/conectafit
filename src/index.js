import express from 'express';
import db from './config/db.js'; // Importante incluir a extensão .js no final!

const app = express();
app.use(express.json());

app.get('/api/status', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ mensagem: 'API do Conecta Fit funcionando!', horaBanco: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});