import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import nodemailer from "nodemailer";
import db from "./db.js";

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("Defina JWT_SECRET no .env com pelo menos 32 caracteres.");
}

app.use(
  cors({
    origin: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:3000").split(",").map((item) => item.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb", strict: true }));
app.use(express.urlencoded({ limit: "100kb", extended: false, parameterLimit: 50 }));

const limiterAcessos = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Muitas tentativas vindas deste IP. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/login", limiterAcessos);
app.use("/api/cadastro", rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false }));

app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const limiterRecuperacao = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.use("/api/senha", limiterRecuperacao);

const respostaRecuperacao = { message: "Se houver uma conta com este e-mail, enviaremos as instruções de recuperação." };

// Campo-isca: visitantes reais não o enxergam nem devem preenchê-lo.
function honeypotPreenchido(req) {
  return typeof req.body?.website === "string" && req.body.website.trim().length > 0;
}

function registrarHoneypot(acao) {
  console.info(`🍯 Olha que fofinho tentando fazer ${acao} automático... caiu no honeypot.`);
}

app.post("/api/senha/recuperar", async (req, res) => {
  if (honeypotPreenchido(req)) {
    registrarHoneypot("uma recuperação de senha");
    return res.json({ honeypot: true, message: "🍯 Olha que fofinho tentando recuperar uma senha automaticamente... caiu no honeypot!" });
  }
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  let tipoUsuario = typeof req.body.tipo_usuario === "string" ? req.body.tipo_usuario.trim().toLowerCase() : "";
  if (tipoUsuario === "nutricionista") tipoUsuario = "nutri";
  if (email.length > 254 || (email && !/^\S+@\S+\.\S+$/.test(email))) return res.status(400).json({ message: "E-mail inválido." });
  if (!email || !["aluno", "personal", "nutri", "academia"].includes(tipoUsuario)) return res.status(400).json({ message: "Informe seu e-mail e o tipo de perfil." });
  try {
    const usuario = await db.query("SELECT id, nome FROM usuarios WHERE LOWER(email) = $1 AND LOWER(tipo_usuario) = $2 LIMIT 1", [email, tipoUsuario]);
    if (!usuario.rows.length || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return res.json(respostaRecuperacao);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.query("INSERT INTO recuperacoes_senha (usuario_id, token_hash, expira_em) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')", [usuario.rows[0].id, tokenHash]);
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha?token=${token}`;
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    await transporter.sendMail({ from: process.env.GMAIL_USER, to: email, subject: "Recuperação de senha — ConectaFit", text: `Olá ${usuario.rows[0].nome}, use este link em até 30 minutos: ${link}` });
    return res.json(respostaRecuperacao);
  } catch (error) { console.error("ERRO RECUPERACAO:", error.message); return res.json(respostaRecuperacao); }
});

app.post("/api/senha/redefinir", async (req, res) => {
  const { token, senha } = req.body;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || typeof senha !== "string" || senha.length > 128) return res.status(400).json({ message: "Link ou senha inválidos." });
  if (typeof token !== "string" || typeof senha !== "string" || senha.length < 8) return res.status(400).json({ message: "Link ou senha inválidos. Use pelo menos 8 caracteres." });
  const hash = crypto.createHash("sha256").update(token).digest("hex"); const client = await db.connect();
  try { await client.query("BEGIN"); const item = await client.query("SELECT id, usuario_id FROM recuperacoes_senha WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > NOW() FOR UPDATE", [hash]); if (!item.rows.length) { await client.query("ROLLBACK"); return res.status(400).json({ message: "Link inválido ou expirado." }); } const senhaHash = await bcrypt.hash(senha, 12); await client.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [senhaHash, item.rows[0].usuario_id]); await client.query("UPDATE recuperacoes_senha SET usado_em = NOW() WHERE id = $1", [item.rows[0].id]); await client.query("COMMIT"); return res.json({ message: "Senha redefinida com sucesso." }); } catch (error) { await client.query("ROLLBACK"); return res.status(500).json({ message: "Erro ao redefinir senha." }); } finally { client.release(); }
});

async function autenticar(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Autenticação obrigatória." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    const atual = await db.query("SELECT id,email,tipo_usuario,nome FROM usuarios WHERE id=$1 AND email=$2", [payload.id, payload.email]);
    if (!atual.rows.length) return res.status(401).json({ message: "Sessão inválida ou conta removida." });
    req.usuario = atual.rows[0];
    return next();
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada. Entre novamente." });
  }
}

function somenteProprioId(req, res, next) {
  return String(req.usuario.id) === String(req.params.usuarioId) ? next() : res.status(403).json({ message: "Você não pode acessar dados de outra conta." });
}

function forcarUsuarioAutenticado(req, _res, next) {
  req.body.usuario_id = req.usuario.id;
  next();
}

// ROTA DE CADASTRO
app.post("/api/cadastro", async (req, res) => {
  if (honeypotPreenchido(req)) {
    registrarHoneypot("um cadastro");
    return res.status(201).json({ honeypot: true, message: "🍯 Olha que fofinho tentando fazer cadastro automático... caiu no honeypot!" });
  }
  const { nome, email, senha, tipo_usuario } = req.body;
  if (typeof nome !== "string" || nome.trim().length < 3 || nome.trim().length > 120 || typeof email !== "string" || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || typeof senha !== "string" || senha.length < 8 || senha.length > 128 || typeof tipo_usuario !== "string") return res.status(400).json({ message: "Dados de cadastro inválidos." });

  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ message: "Todos os campos são obrigatórios." });
  }

  const emailTratado = email.trim().toLowerCase();
  let tipoTratado = tipo_usuario.trim().toLowerCase();
  if (tipoTratado === "nutricionista") tipoTratado = "nutri";
  if (!["aluno", "personal", "nutri", "academia"].includes(tipoTratado)) return res.status(400).json({ message: "Tipo de perfil inválido." });

  try {
    const checagem = await db.query(
      "SELECT id FROM usuarios WHERE LOWER(email) = $1 AND LOWER(tipo_usuario) = $2",
      [emailTratado, tipoTratado]
    );

    if (checagem.rows.length > 0) {
      return res.status(400).json({ message: "Este e-mail já está cadastrado no sistema." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, nome, email, tipo_usuario, criado_em`,
      [nome.trim(), emailTratado, senhaHash, tipoTratado]
    );

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      usuario: novoUsuario.rows[0],
    });
  } catch (error) {
    console.error("ERRO NO CADASTRO:", error.message);
    return res.status(500).json({ message: "Erro ao processar o cadastro." });
  }
});

// ROTA DE LOGIN
app.post("/api/login", async (req, res) => {
  const { email, senha, tipo_usuario } = req.body;
  if (typeof email !== "string" || email.length > 254 || typeof senha !== "string" || senha.length > 128 || typeof tipo_usuario !== "string") return res.status(400).json({ message: "Dados de acesso inválidos." });

  if (!email || !senha || !tipo_usuario) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
  }

  const emailTratado = email.trim().toLowerCase();
  let tipoTratado = tipo_usuario?.trim().toLowerCase();
  if (tipoTratado === "nutricionista") tipoTratado = "nutri";
  if (!["aluno", "personal", "nutri", "academia"].includes(tipoTratado)) return res.status(401).json({ message: "E-mail, senha ou perfil inválido." });

  try {
    const result = await db.query(
      "SELECT id, nome, email, senha_hash, tipo_usuario, cidade, foto_url FROM usuarios WHERE LOWER(email) = $1 AND LOWER(tipo_usuario) = $2",
      [emailTratado, tipoTratado]
    );

    if (result.rows.length === 0) {
      await bcrypt.compare(senha, "$2b$12$hZdeB6q7x3vN97Ta7Z6GCeWca68J1pUnG4eXwYd8D7mE.8XvW2k6S");
      return res.status(401).json({ message: "E-mail, senha ou perfil inválido." });
    }

    const usuario = result.rows[0];

    if (!usuario.senha_hash) {
      return res.status(401).json({ message: "Senha não cadastrada para este usuário." });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ message: "E-mail, senha ou perfil inválido." });
    }

    if (tipo_usuario) {
      let tipoEnviado = tipo_usuario.trim().toLowerCase();
      if (tipoEnviado === "nutricionista") tipoEnviado = "nutri";

      let tipoBanco = (usuario.tipo_usuario || "").toLowerCase();
      if (tipoBanco === "nutricionista") tipoBanco = "nutri";

      if (tipoEnviado !== tipoBanco) {
        return res.status(401).json({
          message: `Este e-mail pertence a um perfil do tipo "${usuario.tipo_usuario}". Selecione o perfil correto no topo.`,
        });
      }
    }

    delete usuario.senha_hash;

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario,
      token,
    });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error.message);
    return res.status(500).json({ message: "Erro ao realizar login." });
  }
});

// CONSULTA DE USUÁRIOS
app.get("/api/usuarios", autenticar, (_req, res) => res.status(403).json({ message: "Listagem global de usuários não é permitida." }), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome, email, tipo_usuario, criado_em FROM usuarios ORDER BY id DESC"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar a lista de usuários." });
  }
});

// PERFIL PERSONAL
app.get("/api/personal/perfil/:usuarioId", autenticar, exigirPerfil("personal"), somenteProprioId, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const perfil = await db.query(
      "SELECT * FROM perfis_personal WHERE usuario_id = $1",
      [usuarioId]
    );

    if (perfil.rows.length === 0) {
      return res.status(200).json(null);
    }

    const fotos = await db.query(
      "SELECT * FROM fotos_trabalho_personal WHERE personal_id = $1 ORDER BY criado_em DESC",
      [perfil.rows[0].id]
    );

    return res.status(200).json({
      ...perfil.rows[0],
      fotos: fotos.rows,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR PERFIL DO PERSONAL:", error.message);
    return res.status(500).json({ message: "Erro ao buscar dados do perfil." });
  }
});

app.post("/api/personal/perfil", autenticar, exigirPerfil("personal"), forcarUsuarioAutenticado, async (req, res) => {
  const {
    nome, foto_perfil, contato, whatsapp, instagram, 
    formacao, sobre_mim, cidade, preco_diaria, preco_semanal, preco_mensal, preco_anual
  } = req.body;

  if (!nome) {
    return res.status(400).json({ message: "O nome é obrigatório." });
  }

  try {
    const usuario_id = await obterOuCriarUsuarioId(req.body.usuario_id);

    const query = `
      INSERT INTO perfis_personal 
        (usuario_id, nome, foto_perfil, contato, whatsapp, instagram, formacao, sobre_mim, cidade, preco_diaria, preco_semanal, preco_mensal, preco_anual)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        foto_perfil = EXCLUDED.foto_perfil,
        contato = EXCLUDED.contato,
        whatsapp = EXCLUDED.whatsapp,
        instagram = EXCLUDED.instagram,
        formacao = EXCLUDED.formacao,
        sobre_mim = EXCLUDED.sobre_mim,
        cidade = EXCLUDED.cidade,
        preco_diaria = EXCLUDED.preco_diaria,
        preco_semanal = EXCLUDED.preco_semanal,
        preco_mensal = EXCLUDED.preco_mensal,
        preco_anual = EXCLUDED.preco_anual
      RETURNING *;
    `;

    const values = [
      usuario_id, nome, foto_perfil || null, contato || null, whatsapp || null,
      instagram || null, formacao || null, sobre_mim || null, cidade || null,
      preco_diaria || null, preco_semanal || null, preco_mensal || null, preco_anual || null
    ];

    const result = await db.query(query, values);
    return res.status(200).json({
      message: "Perfil atualizado com sucesso!",
      perfil: result.rows[0],
    });
  } catch (error) {
    console.error("ERRO AO SALVAR PERFIL DO PERSONAL:", error.message);
    return res.status(500).json({ message: "Erro ao salvar perfil." });
  }
});

// PERFIL ACADEMIA
app.get("/api/academia/perfil/:usuarioId", autenticar, exigirPerfil("academia"), somenteProprioId, async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const perfil = await db.query(
      "SELECT * FROM perfis_academia WHERE usuario_id = $1",
      [usuarioId]
    );

    if (perfil.rows.length === 0) {
      return res.status(200).json(null);
    }

    const fotos = await db.query(
      "SELECT foto_url FROM fotos_academia WHERE academia_id = $1 ORDER BY id DESC",
      [perfil.rows[0].id]
    );

    return res.status(200).json({
      ...perfil.rows[0],
      fotos: fotos.rows.map((f) => f.foto_url),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR PERFIL DA ACADEMIA:", error.message);
    return res.status(500).json({ message: "Erro ao buscar dados da academia." });
  }
});

app.post("/api/academia/perfil", autenticar, exigirPerfil("academia"), forcarUsuarioAutenticado, async (req, res) => {
  const { nome, email, cnpj, telefone, cidade, endereco, bio, fotos, preco_diaria, preco_mensal, preco_anual, modalidades, videos } = req.body;

  const client = await db.connect();

  try {
    const usuario_id = await obterOuCriarUsuarioId(req.body.usuario_id);

    await client.query('BEGIN');

    const query = `
      INSERT INTO perfis_academia (usuario_id, nome, email, cnpj, telefone, cidade, endereco, bio, preco_diaria, preco_mensal, preco_anual, modalidades, videos)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        cnpj = EXCLUDED.cnpj,
        telefone = EXCLUDED.telefone,
        cidade = EXCLUDED.cidade,
        endereco = EXCLUDED.endereco,
        bio = EXCLUDED.bio,
        preco_diaria = EXCLUDED.preco_diaria, preco_mensal = EXCLUDED.preco_mensal,
        preco_anual = EXCLUDED.preco_anual, modalidades = EXCLUDED.modalidades, videos = EXCLUDED.videos
      RETURNING *;
    `;

    const values = [
      usuario_id, 
      nome || 'Unidade Sem Nome', 
      email || null, 
      cnpj || null, 
      telefone || null, 
      cidade || null, 
      endereco || null, 
      bio || null, preco_diaria || null, preco_mensal || null, preco_anual || null,
      JSON.stringify(Array.isArray(modalidades) ? modalidades : []), JSON.stringify(Array.isArray(videos) ? videos : [])
    ];
    
    const result = await client.query(query, values);
    const academia = result.rows[0];

    if (Array.isArray(fotos)) {
      await client.query("DELETE FROM fotos_academia WHERE academia_id = $1", [academia.id]);

      for (const fotoUrl of fotos) {
        if (fotoUrl && fotoUrl.trim() !== "") {
          await client.query(
            "INSERT INTO fotos_academia (academia_id, foto_url) VALUES ($1, $2)",
            [academia.id, fotoUrl]
          );
        }
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      message: "Perfil da academia salvo com sucesso!",
      perfil: { ...academia, fotos: fotos || [] },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("ERRO DETALHADO NO POSTGRESQL DA ACADEMIA:", error);
    return res.status(500).json({ message: "Erro ao salvar dados da academia: " + error.message });
  } finally {
    client.release();
  }
});

// ==========================================
// TRATAMENTO DE USUÁRIO E ROTAS DE TREINOS
// ==========================================

async function obterOuCriarUsuarioId(idRequisitado) {
  const parsedId = parseInt(idRequisitado, 10);

  // 1. Se um ID numérico válido foi enviado, verifica se ele realmente existe na tabela usuarios
  if (!isNaN(parsedId) && parsedId > 0) {
    const checagem = await db.query("SELECT id FROM usuarios WHERE id = $1", [parsedId]);
    if (checagem.rows.length > 0) {
      return checagem.rows[0].id;
    }
  }

  // 2. Se o ID enviado não existe ou não foi passado, busca o primeiro usuário cadastrado
  const res = await db.query("SELECT id FROM usuarios ORDER BY id ASC LIMIT 1");
  if (res.rows.length > 0) {
    return res.rows[0].id;
  }

  // 3. Se a tabela 'usuarios' estiver 100% vazia, insere um usuário padrão
  const novoUser = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) 
     VALUES ('Usuário de Teste', 'teste@teste.com', '$2a$10$e8.Z3u7Ggq1V/X2.9P4x8.vN9YlX0Y00Y00Y00Y00Y00Y00Y00Y00', 'aluno') 
     RETURNING id`
  );
  return novoUser.rows[0].id;
}

app.get("/api/usuario/me", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome, email, tipo_usuario, cidade, foto_url FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Sessão sem usuário válido." });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("ERRO AO BUSCAR USUARIO ATUAL:", error.message);
    return res.status(500).json({ message: "Erro ao buscar usuário atual." });
  }
});

function treinoValido(titulo, exercicios) {
  return typeof titulo === "string" && titulo.trim().length > 0 && titulo.trim().length <= 120 &&
    Array.isArray(exercicios) && exercicios.length > 0 && exercicios.length <= 50 &&
    exercicios.every((exercicio) => typeof exercicio?.nome === "string" && exercicio.nome.trim().length > 0 && exercicio.nome.trim().length <= 120);
}

// BUSCAR TREINOS
app.get("/api/treinos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM treinos WHERE usuario_id = $1 ORDER BY criado_em DESC",
      [req.usuario.id]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR TREINOS:", error.message);
    return res.status(500).json({ message: "Erro ao buscar treinos: " + error.message });
  }
});

// CRIAR UM NOVO TREINO
app.post("/api/treinos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { titulo, exercicios } = req.body;

  if (!treinoValido(titulo, exercicios)) {
    return res.status(400).json({ message: "Dados do treino inválidos." });
  }

  if (!titulo) {
    return res.status(400).json({ message: "O título do treino é obrigatório." });
  }

  try {
    const result = await db.query(
      `INSERT INTO treinos (usuario_id, titulo, exercicios, origem, criado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.usuario.id, titulo.trim(), JSON.stringify(exercicios), "aluno", req.usuario.nome || null]
    );

    return res.status(201).json({
      message: "Treino criado com sucesso!",
      treino: result.rows[0],
    });
  } catch (error) {
    console.error("ERRO DETALHADO AO CRIAR TREINO:", error);
    return res.status(500).json({ message: "Erro ao criar treino: " + error.message });
  }
});

// ATUALIZAR UM TREINO EXISTENTE
app.put("/api/treinos/:id", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const treinoId = req.params.id;
  const { titulo, exercicios } = req.body;

  if (!/^\d+$/.test(treinoId) || !treinoValido(titulo, exercicios)) {
    return res.status(400).json({ message: "Dados do treino inválidos." });
  }

  try {
    const result = await db.query(
      `UPDATE treinos 
       SET titulo = $1, exercicios = $2, origem = $3, criado_por = $4 
       WHERE id = $5 AND usuario_id = $6
       RETURNING *`,
      [titulo.trim(), JSON.stringify(exercicios), "aluno", req.usuario.nome || null, treinoId, req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Treino não encontrado." });
    }

    return res.status(200).json({
      message: "Treino atualizado com sucesso!",
      treino: result.rows[0],
    });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR TREINO:", error.message);
    return res.status(500).json({ message: "Erro ao atualizar treino." });
  }
});

// DELETAR UM TREINO
app.delete("/api/treinos/:id", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const treinoId = req.params.id;

  if (!/^\d+$/.test(treinoId)) {
    return res.status(400).json({ message: "Identificador de treino inválido." });
  }

  try {
    const result = await db.query(
      "DELETE FROM treinos WHERE id = $1 AND usuario_id = $2 RETURNING *",
      [treinoId, req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Treino não encontrado." });
    }

    return res.status(200).json({ message: "Treino excluído com sucesso!" });
  } catch (error) {
    console.error("ERRO AO DELETAR TREINO:", error.message);
    return res.status(500).json({ message: "Erro ao excluir treino." });
  }
});

function exigirPerfil(...tipos) {
  return (req, res, next) => tipos.includes(req.usuario?.tipo_usuario) ? next() : res.status(403).json({ message: "Acesso não permitido para este perfil." });
}

app.get("/api/profissional/dashboard", autenticar, exigirPerfil("personal", "nutri"), async (req, res) => {
  const tabela = req.usuario.tipo_usuario === "personal" ? "conexoes_alunos" : "conexoes_nutri";
  const coluna = req.usuario.tipo_usuario === "personal" ? "personal_id" : "nutri_id";
  try {
    const r = await db.query(`SELECT
      COUNT(*) FILTER (WHERE status='aceito')::int AS alunos_ativos,
      COUNT(*) FILTER (WHERE status='pendente')::int AS solicitacoes_pendentes,
      (SELECT COUNT(*)::int FROM visitas_perfil WHERE perfil_usuario_id=$1) AS visitas,
      (SELECT COUNT(*)::int FROM agenda_profissional WHERE profissional_id=$1 AND data=CURRENT_DATE) AS compromissos_hoje
      FROM ${tabela} WHERE ${coluna}=$1`, [req.usuario.id]);
    return res.json(r.rows[0]);
  } catch (error) { console.error("ERRO DASH PROFISSIONAL:", error.message); return res.status(500).json({ message: "Erro ao carregar indicadores." }); }
});

app.get("/api/profissional/solicitacoes", autenticar, exigirPerfil("personal", "nutri"), async (req, res) => {
  const tabela = req.usuario.tipo_usuario === "personal" ? "conexoes_alunos" : "conexoes_nutri";
  const coluna = req.usuario.tipo_usuario === "personal" ? "personal_id" : "nutri_id";
  try { const r=await db.query(`SELECT c.id,c.criado_em,u.id AS aluno_id,u.nome,u.email,u.telefone FROM ${tabela} c JOIN usuarios u ON u.id=c.aluno_id WHERE c.${coluna}=$1 AND c.status='pendente' ORDER BY c.criado_em`,[req.usuario.id]); return res.json(r.rows); }
  catch { return res.status(500).json({message:"Erro ao buscar solicitações."}); }
});

app.patch("/api/profissional/solicitacoes/:id", autenticar, exigirPerfil("personal", "nutri"), async (req, res) => {
  const tabela=req.usuario.tipo_usuario==="personal"?"conexoes_alunos":"conexoes_nutri", coluna=req.usuario.tipo_usuario==="personal"?"personal_id":"nutri_id";
  const status=req.body.status;
  if(!["aceito","recusado"].includes(status)||!/^\d+$/.test(req.params.id))return res.status(400).json({message:"Resposta inválida."});
  try { const r=await db.query(`UPDATE ${tabela} SET status=$1 WHERE id=$2 AND ${coluna}=$3 AND status='pendente' RETURNING id,status`,[status,req.params.id,req.usuario.id]);if(!r.rows.length)return res.status(404).json({message:"Solicitação não encontrada."});return res.json(r.rows[0]); }
  catch{return res.status(500).json({message:"Erro ao responder solicitação."});}
});

app.get("/api/profissional/alunos", autenticar, exigirPerfil("personal", "nutri"), async (req,res)=>{
  const personal=req.usuario.tipo_usuario==="personal", tabela=personal?"conexoes_alunos":"conexoes_nutri", coluna=personal?"personal_id":"nutri_id";
  try{const r=await db.query(`SELECT u.id,u.nome,u.email,u.telefone,u.cidade,u.foto_url,c.id AS conexao_id,c.permite_medidas,c.permite_fotos,c.permite_metas,${personal?'c.permite_treinos':'c.permite_dietas'} AS permite_principal FROM ${tabela} c JOIN usuarios u ON u.id=c.aluno_id WHERE c.${coluna}=$1 AND c.status='aceito' ORDER BY u.nome`,[req.usuario.id]);return res.json(r.rows)}catch{return res.status(500).json({message:"Erro ao buscar alunos."})}
});

app.get("/api/profissional/alunos/:id", autenticar, exigirPerfil("personal", "nutri"), async (req,res)=>{
  const personal=req.usuario.tipo_usuario==="personal", tabela=personal?"conexoes_alunos":"conexoes_nutri", coluna=personal?"personal_id":"nutri_id";
  try{const acesso=await db.query(`SELECT permite_medidas,permite_fotos,permite_metas,${personal?'permite_treinos':'permite_dietas'} AS permite_principal FROM ${tabela} WHERE ${coluna}=$1 AND aluno_id=$2 AND status='aceito'`,[req.usuario.id,req.params.id]);if(!acesso.rows.length)return res.status(404).json({message:"Aluno não conectado."});const p=acesso.rows[0];const usuario=await db.query("SELECT id,nome,email,telefone,cidade,foto_url FROM usuarios WHERE id=$1",[req.params.id]);const dados={usuario:usuario.rows[0],permissoes:p};if(p.permite_medidas)dados.medidas=(await db.query("SELECT * FROM medidas_aluno WHERE aluno_id=$1 ORDER BY data_medicao DESC",[req.params.id])).rows;if(p.permite_fotos)dados.fotos=(await db.query("SELECT * FROM fotos_evolucao WHERE aluno_id=$1 ORDER BY data_registro DESC",[req.params.id])).rows;if(p.permite_metas)dados.metas=(await db.query("SELECT * FROM metas_aluno WHERE aluno_id=$1",[req.params.id])).rows[0]||null;if(p.permite_principal)dados.planos=(await db.query(personal?"SELECT * FROM treinos WHERE usuario_id=$1 ORDER BY criado_em DESC":"SELECT * FROM planos_alimentares WHERE aluno_id=$1 ORDER BY criado_em DESC",[req.params.id])).rows;return res.json(dados)}catch(error){console.error("ERRO ALUNO PROF:",error.message);return res.status(500).json({message:"Erro ao carregar aluno."})}
});

app.post("/api/profissional/alunos/:id/planos", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{const alunoId=req.params.id,{titulo,descricao}=req.body;if(!/^\d+$/.test(alunoId)||typeof titulo!=="string"||titulo.trim().length<3)return res.status(400).json({message:"Informe um título válido."});const personal=req.usuario.tipo_usuario==="personal",tabela=personal?"conexoes_alunos":"conexoes_nutri",coluna=personal?"personal_id":"nutri_id";try{const acesso=await db.query(`SELECT id FROM ${tabela} WHERE ${coluna}=$1 AND aluno_id=$2 AND status='aceito'`,[req.usuario.id,alunoId]);if(!acesso.rows.length)return res.status(403).json({message:"Aluno não conectado."});let r;if(personal)r=await db.query("INSERT INTO treinos(usuario_id,titulo,exercicios,origem,criado_por) VALUES($1,$2,$3,'personal',$4) RETURNING *",[alunoId,titulo.trim(),JSON.stringify([{nome:descricao?.trim()||'Exercícios a definir'}]),req.usuario.nome||req.usuario.email]);else r=await db.query("INSERT INTO planos_alimentares(aluno_id,nutri_id,titulo,descricao) VALUES($1,$2,$3,$4) RETURNING *",[alunoId,req.usuario.id,titulo.trim(),descricao||null]);return res.status(201).json(r.rows[0])}catch(error){console.error(error.message);return res.status(500).json({message:"Erro ao criar plano."})}});

app.get("/api/profissional/agenda", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{try{const r=await db.query("SELECT * FROM agenda_profissional WHERE profissional_id=$1 ORDER BY data,hora_inicio",[req.usuario.id]);return res.json(r.rows)}catch{return res.status(500).json({message:"Erro ao buscar agenda."})}});
app.post("/api/profissional/agenda", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{const{aluno_id,aluno_nome,data,hora_inicio,hora_fim,tipo,observacao}=req.body;if(!aluno_nome||!data||!hora_inicio||!hora_fim)return res.status(400).json({message:"Preencha aluno, data e horários."});try{const r=await db.query("INSERT INTO agenda_profissional(profissional_id,aluno_id,aluno_nome,data,hora_inicio,hora_fim,tipo,observacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[req.usuario.id,aluno_id||null,aluno_nome.trim(),data,hora_inicio,hora_fim,tipo||'Presencial',observacao||null]);return res.status(201).json(r.rows[0])}catch{return res.status(400).json({message:"Horário inválido."})}});
app.delete("/api/profissional/agenda/:id", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{try{await db.query("DELETE FROM agenda_profissional WHERE id=$1 AND profissional_id=$2",[req.params.id,req.usuario.id]);return res.status(204).end()}catch{return res.status(500).json({message:"Erro ao remover horário."})}});

app.get("/api/nutri/perfil/me", autenticar, exigirPerfil("nutri"), async(req,res)=>{try{const r=await db.query("SELECT p.*,u.email FROM perfis_nutri p JOIN usuarios u ON u.id=p.usuario_id WHERE p.usuario_id=$1",[req.usuario.id]);return res.json(r.rows[0]||null)}catch{return res.status(500).json({message:"Erro ao buscar perfil."})}});
app.put("/api/nutri/perfil/me", autenticar, exigirPerfil("nutri"), async(req,res)=>{const p=req.body;try{const r=await db.query(`INSERT INTO perfis_nutri(usuario_id,nome,crn,bio,cidade,contato,foto_perfil,whatsapp,instagram,formacao,preco_diaria,preco_semanal,preco_mensal,preco_anual) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(usuario_id) DO UPDATE SET nome=$2,crn=$3,bio=$4,cidade=$5,contato=$6,foto_perfil=$7,whatsapp=$8,instagram=$9,formacao=$10,preco_diaria=$11,preco_semanal=$12,preco_mensal=$13,preco_anual=$14,atualizado_em=NOW() RETURNING *`,[req.usuario.id,p.nome,p.crn||null,p.bio||null,p.cidade||null,p.contato||null,p.foto_perfil||null,p.whatsapp||null,p.instagram||null,p.formacao||null,p.preco_diaria||null,p.preco_semanal||null,p.preco_mensal||null,p.preco_anual||null]);return res.json(r.rows[0])}catch{return res.status(400).json({message:"Não foi possível salvar o perfil."})}});

app.get("/api/servicos/:tipo/:id", autenticar, async(req,res)=>{const{tipo,id}=req.params;if(!["personal","nutricionista","academia"].includes(tipo)||!/^\d+$/.test(id))return res.status(400).json({message:"Perfil inválido."});try{let r;if(tipo==="personal")r=await db.query("SELECT u.id,u.nome,u.cidade,p.* FROM usuarios u LEFT JOIN perfis_personal p ON p.usuario_id=u.id WHERE u.id=$1 AND u.tipo_usuario='personal'",[id]);else if(tipo==="nutricionista")r=await db.query("SELECT u.id,u.nome,u.cidade,p.* FROM usuarios u LEFT JOIN perfis_nutri p ON p.usuario_id=u.id WHERE u.id=$1 AND u.tipo_usuario='nutri'",[id]);else r=await db.query("SELECT u.id,u.nome,u.cidade,p.*,COALESCE((SELECT json_agg(f.foto_url) FROM fotos_academia f WHERE f.academia_id=p.id),'[]') AS fotos FROM usuarios u LEFT JOIN perfis_academia p ON p.usuario_id=u.id WHERE u.id=$1 AND u.tipo_usuario='academia'",[id]);if(!r.rows.length)return res.status(404).json({message:"Perfil não encontrado."});await db.query("INSERT INTO visitas_perfil(perfil_usuario_id,visitante_id) VALUES($1,$2)",[id,req.usuario.id]);return res.json(r.rows[0])}catch(error){console.error(error.message);return res.status(500).json({message:"Erro ao abrir perfil."})}});

app.get("/api/academia/dashboard", autenticar, exigirPerfil("academia"), async(req,res)=>{try{const r=await db.query("SELECT COUNT(*)::int AS visitas, COUNT(*) FILTER (WHERE visitado_em >= date_trunc('month',CURRENT_DATE))::int AS visitas_mes FROM visitas_perfil WHERE perfil_usuario_id=$1",[req.usuario.id]);return res.json(r.rows[0])}catch{return res.status(500).json({message:"Erro ao carregar visitas."})}});

// Evolução, perfil e metas do aluno
app.get("/api/aluno/resumo", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM conexoes_alunos WHERE aluno_id=$1 AND status='aceito') +
        (SELECT COUNT(*)::int FROM conexoes_nutri WHERE aluno_id=$1 AND status='aceito') AS conexoes,
        COALESCE(m.agua_litros, 2) AS agua_meta, COALESCE(m.treinos_semana, 3) AS treinos_meta,
        COALESCE(m.refeicoes_semana, 14) AS refeicoes_meta,
        COALESCE(p.agua_litros, 0) AS agua_atual, COALESCE(p.treinos_concluidos, 0) AS treinos_atual,
        COALESCE(p.refeicoes_corretas, 0) AS refeicoes_atual
      FROM (SELECT 1) base
      LEFT JOIN metas_aluno m ON m.aluno_id=$1
      LEFT JOIN progresso_semanal p ON p.aluno_id=$1 AND p.semana=date_trunc('week', CURRENT_DATE)::date`, [req.usuario.id]);
    const [treino, refeicao] = await Promise.all([
      db.query("SELECT titulo,criado_por,exercicios FROM treinos WHERE usuario_id=$1 ORDER BY criado_em DESC LIMIT 1",[req.usuario.id]),
      db.query("SELECT r.nome,r.horario,r.descricao AS detalhes FROM refeicoes_plano r JOIN planos_alimentares p ON p.id=r.plano_id WHERE p.aluno_id=$1 AND p.ativo=TRUE ORDER BY r.horario NULLS LAST LIMIT 1",[req.usuario.id])
    ]);
    return res.json({...resultado.rows[0],proximo_treino:treino.rows[0]||null,proxima_refeicao:refeicao.rows[0]||null});
  } catch (error) { console.error("ERRO RESUMO:", error.message); return res.status(500).json({ message: "Erro ao carregar dashboard." }); }
});

app.get("/api/aluno/metas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const [meta, progresso] = await Promise.all([
      db.query("SELECT * FROM metas_aluno WHERE aluno_id=$1", [req.usuario.id]),
      db.query("SELECT * FROM progresso_semanal WHERE aluno_id=$1 AND semana=date_trunc('week', CURRENT_DATE)::date", [req.usuario.id])
    ]);
    return res.json({ meta: meta.rows[0] || null, progresso: progresso.rows[0] || null });
  } catch (error) { return res.status(500).json({ message: "Erro ao buscar metas." }); }
});

app.put("/api/aluno/metas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const numero = (valor) => valor === "" || valor == null ? null : Number(valor);
  const m = req.body;
  try {
    const resultado = await db.query(`INSERT INTO metas_aluno
      (aluno_id,peso_meta,cintura_meta,braco_meta,quadril_meta,percentual_gordura_meta,agua_litros,treinos_semana,refeicoes_semana)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (aluno_id) DO UPDATE SET
      peso_meta=$2,cintura_meta=$3,braco_meta=$4,quadril_meta=$5,percentual_gordura_meta=$6,
      agua_litros=$7,treinos_semana=$8,refeicoes_semana=$9,atualizado_em=NOW() RETURNING *`,
      [req.usuario.id,numero(m.peso_meta),numero(m.cintura_meta),numero(m.braco_meta),numero(m.quadril_meta),numero(m.percentual_gordura_meta),numero(m.agua_litros)||2,Number(m.treinos_semana)||3,Number(m.refeicoes_semana)||14]);
    return res.json(resultado.rows[0]);
  } catch (error) { return res.status(400).json({ message: "Confira os valores informados." }); }
});

app.put("/api/aluno/progresso", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { agua_litros=0, treinos_concluidos=0, refeicoes_corretas=0 } = req.body;
  try {
    const resultado = await db.query(`INSERT INTO progresso_semanal (aluno_id,semana,agua_litros,treinos_concluidos,refeicoes_corretas)
      VALUES ($1,date_trunc('week',CURRENT_DATE)::date,$2,$3,$4) ON CONFLICT (aluno_id,semana) DO UPDATE SET
      agua_litros=$2,treinos_concluidos=$3,refeicoes_corretas=$4 RETURNING *`,
      [req.usuario.id, Number(agua_litros), Number(treinos_concluidos), Number(refeicoes_corretas)]);
    return res.json(resultado.rows[0]);
  } catch (error) { return res.status(400).json({ message: "Progresso inválido." }); }
});

app.get("/api/aluno/medidas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const [medidas, fotos] = await Promise.all([
      db.query("SELECT * FROM medidas_aluno WHERE aluno_id=$1 ORDER BY data_medicao DESC,id DESC", [req.usuario.id]),
      db.query("SELECT * FROM fotos_evolucao WHERE aluno_id=$1 ORDER BY data_registro DESC", [req.usuario.id])
    ]);
    return res.json({ medidas: medidas.rows, fotos: fotos.rows });
  } catch { return res.status(500).json({ message: "Erro ao buscar evolução." }); }
});

app.post("/api/aluno/medidas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { data_medicao, peso, altura, cintura, quadril, braco_direito, braco_esquerdo, percentual_gordura, observacoes } = req.body;
  const n = (v) => v === "" || v == null ? null : Number(v);
  try {
    const resultado = await db.query(`INSERT INTO medidas_aluno
      (aluno_id,data_medicao,peso,altura,cintura,quadril,braco_direito,braco_esquerdo,percentual_gordura,observacoes)
      VALUES ($1,COALESCE($2::date,CURRENT_DATE),$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.usuario.id,data_medicao||null,n(peso),n(altura),n(cintura),n(quadril),n(braco_direito),n(braco_esquerdo),n(percentual_gordura),observacoes||null]);
    return res.status(201).json(resultado.rows[0]);
  } catch { return res.status(400).json({ message: "Confira as medidas informadas." }); }
});

app.post("/api/aluno/fotos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { data_registro, frente_url, costas_url, lado_esquerdo_url, lado_direito_url } = req.body;
  try {
    const resultado = await db.query(`INSERT INTO fotos_evolucao
      (aluno_id,data_registro,frente_url,costas_url,lado_esquerdo_url,lado_direito_url)
      VALUES ($1,COALESCE($2::date,CURRENT_DATE),$3,$4,$5,$6) ON CONFLICT (aluno_id,data_registro) DO UPDATE SET
      frente_url=$3,costas_url=$4,lado_esquerdo_url=$5,lado_direito_url=$6 RETURNING *`,
      [req.usuario.id,data_registro||null,frente_url||null,costas_url||null,lado_esquerdo_url||null,lado_direito_url||null]);
    return res.status(201).json(resultado.rows[0]);
  } catch { return res.status(400).json({ message: "Não foi possível registrar as fotos." }); }
});

app.put("/api/conexoes/:tipo/:id/permissoes", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { tipo, id } = req.params;
  if (!['personal','nutricionista'].includes(tipo) || !/^\d+$/.test(id)) return res.status(400).json({ message: "Conexão inválida." });
  const tabela = tipo === 'personal' ? 'conexoes_alunos' : 'conexoes_nutri';
  const primeira = tipo === 'personal' ? 'permite_treinos' : 'permite_dietas';
  try {
    const r = await db.query(`UPDATE ${tabela} SET ${primeira}=$1, permite_medidas=$2, permite_fotos=$3, permite_metas=$4 WHERE id=$5 AND aluno_id=$6 AND status='aceito' RETURNING *`,
      [Boolean(req.body[primeira]),Boolean(req.body.permite_medidas),Boolean(req.body.permite_fotos),Boolean(req.body.permite_metas),id,req.usuario.id]);
    if (!r.rows.length) return res.status(404).json({ message: "Conexão ativa não encontrada." });
    return res.json(r.rows[0]);
  } catch { return res.status(500).json({ message: "Erro ao salvar permissões." }); }
});

app.put("/api/aluno/perfil", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { nome, telefone, cidade, foto_url } = req.body;
  if (typeof nome !== 'string' || nome.trim().length < 3) return res.status(400).json({ message: "Informe seu nome completo." });
  try {
    const r = await db.query("UPDATE usuarios SET nome=$1,telefone=$2,cidade=$3,foto_url=$4 WHERE id=$5 RETURNING id,nome,email,telefone,cidade,foto_url,tipo_usuario", [nome.trim(),telefone||null,cidade||null,foto_url||null,req.usuario.id]);
    return res.json(r.rows[0]);
  } catch { return res.status(500).json({ message: "Erro ao atualizar perfil." }); }
});

app.delete("/api/aluno/conta", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try { await db.query("DELETE FROM usuarios WHERE id=$1 AND tipo_usuario='aluno'", [req.usuario.id]); return res.status(204).end(); }
  catch { return res.status(500).json({ message: "Erro ao excluir conta." }); }
});

app.listen(Number(process.env.PORT || 3001), () => {
  console.log(`Backend rodando na porta ${Number(process.env.PORT || 3001)}`);
});

app.get("/api/dietas/minha", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.titulo, p.descricao, p.meta_calorias, p.criado_em,
        COALESCE(json_agg(json_build_object('id', r.id, 'nome', r.nome, 'horario', r.horario, 'detalhes', r.descricao, 'alimentos', r.alimentos, 'ordem', r.ordem) ORDER BY r.ordem) FILTER (WHERE r.id IS NOT NULL), '[]'::json) AS refeicoes
       FROM planos_alimentares p
       LEFT JOIN refeicoes_plano r ON r.plano_id = p.id
       WHERE p.aluno_id = $1 AND p.ativo = TRUE
       GROUP BY p.id
       ORDER BY p.criado_em DESC`,
      [req.usuario.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR DIETAS:", error.message);
    return res.status(500).json({ message: "Erro ao buscar dietas." });
  }
});

app.post("/api/dietas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { titulo, descricao, meta_calorias } = req.body;
  const calorias = Number(meta_calorias);
  if (typeof titulo !== "string" || titulo.trim().length < 3 || titulo.trim().length > 120 || (meta_calorias != null && (!Number.isInteger(calorias) || calorias <= 0))) {
    return res.status(400).json({ message: "Informe um título válido e, se desejar, uma meta calórica positiva." });
  }
  try {
    const result = await db.query(
      `INSERT INTO planos_alimentares (aluno_id, titulo, descricao, meta_calorias)
       VALUES ($1, $2, $3, $4) RETURNING id, titulo, descricao, meta_calorias, criado_em`,
      [req.usuario.id, titulo.trim(), typeof descricao === "string" ? descricao.trim() || null : null, meta_calorias == null || meta_calorias === "" ? null : calorias]
    );
    return res.status(201).json({ ...result.rows[0], refeicoes: [] });
  } catch (error) {
    console.error("ERRO AO CRIAR DIETA:", error.message);
    return res.status(500).json({ message: "Erro ao criar dieta." });
  }
});

app.post("/api/dietas/:id/refeicoes", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { nome, horario, alimento, quantidade_gramas } = req.body;
  const planoId = req.params.id;
  const quantidade = Number(quantidade_gramas);
  if (!/^\d+$/.test(planoId) || typeof nome !== "string" || !nome.trim() || typeof alimento !== "string" || !alimento.trim() || !Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 5000) {
    return res.status(400).json({ message: "Informe uma refeição, um alimento e a quantidade em gramas." });
  }
  try {
    const plano = await db.query("SELECT id FROM planos_alimentares WHERE id = $1 AND aluno_id = $2", [planoId, req.usuario.id]);
    if (plano.rows.length === 0) return res.status(404).json({ message: "Plano não encontrado." });
    const ordem = await db.query("SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima_ordem FROM refeicoes_plano WHERE plano_id = $1", [planoId]);
    const alimentos = [{ nome: alimento.trim(), quantidade_gramas: quantidade }];
    const result = await db.query(
      `INSERT INTO refeicoes_plano (plano_id, nome, horario, descricao, alimentos, ordem)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, horario, descricao AS detalhes, alimentos, ordem`,
      [planoId, nome.trim(), horario || null, `${alimento.trim()} — ${quantidade}g`, JSON.stringify(alimentos), ordem.rows[0].proxima_ordem]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("ERRO AO CRIAR REFEICAO:", error.message);
    return res.status(500).json({ message: "Erro ao criar refeição." });
  }
});

app.delete("/api/dietas/:id", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const planoId = req.params.id;
  if (!/^\d+$/.test(planoId)) return res.status(400).json({ message: "Identificador de plano inválido." });
  try {
    const result = await db.query("DELETE FROM planos_alimentares WHERE id = $1 AND aluno_id = $2 RETURNING id", [planoId, req.usuario.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Plano não encontrado." });
    return res.status(200).json({ message: "Plano excluído com sucesso." });
  } catch (error) {
    console.error("ERRO AO EXCLUIR DIETA:", error.message);
    return res.status(500).json({ message: "Erro ao excluir plano." });
  }
});

app.get("/api/servicos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const cidade = typeof req.query.cidade === "string" ? req.query.cidade.trim() : "";
    const result = await db.query(
      `SELECT id, nome, tipo, cidade, foto, descricao FROM (
        SELECT pp.usuario_id::text AS id, pp.nome, 'personal' AS tipo, pp.cidade, pp.foto_perfil AS foto, pp.sobre_mim AS descricao FROM perfis_personal pp
        UNION ALL
        SELECT pa.usuario_id::text, pa.nome, 'academia', pa.cidade, (SELECT foto_url FROM fotos_academia WHERE academia_id=pa.id ORDER BY id DESC LIMIT 1), pa.bio FROM perfis_academia pa
        UNION ALL
        SELECT pn.usuario_id::text, pn.nome, 'nutricionista', pn.cidade, pn.foto_perfil, pn.bio FROM perfis_nutri pn
        UNION ALL
        SELECT u.id::text, u.nome, CASE WHEN u.tipo_usuario = 'nutri' THEN 'nutricionista' ELSE u.tipo_usuario END, u.cidade, u.foto_url, NULL
        FROM usuarios u
        WHERE u.tipo_usuario IN ('personal', 'nutri')
          AND NOT EXISTS (SELECT 1 FROM perfis_personal pp WHERE pp.usuario_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM perfis_nutri pn WHERE pn.usuario_id = u.id)
      ) servicos
      WHERE ($1 = '' OR cidade ILIKE '%' || $1 || '%' OR cidade IS NULL)
      ORDER BY nome`,
      [cidade]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR SERVICOS:", error.message);
    return res.status(500).json({ message: "Erro ao buscar serviços." });
  }
});

app.post("/api/conexoes", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { tipo, profissional_id } = req.body;
  const profissionalId = Number(profissional_id);
  if (!['personal', 'nutricionista'].includes(tipo) || !Number.isInteger(profissionalId) || profissionalId <= 0) return res.status(400).json({ message: "Profissional inválido." });
  try {
    const tipoUsuario = tipo === 'nutricionista' ? 'nutri' : 'personal';
    const profissional = await db.query("SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = $2", [profissionalId, tipoUsuario]);
    if (profissional.rows.length === 0) return res.status(404).json({ message: "Profissional não encontrado." });
    if (tipo === 'personal') {
      const result = await db.query(`INSERT INTO conexoes_alunos (personal_id, aluno_id, status) VALUES ($1, $2, 'pendente') ON CONFLICT (personal_id, aluno_id) DO UPDATE SET status = 'pendente', criado_em = NOW() RETURNING id, status`, [profissionalId, req.usuario.id]);
      return res.status(201).json(result.rows[0]);
    }
    const result = await db.query(`INSERT INTO conexoes_nutri (nutri_id, aluno_id, status) VALUES ($1, $2, 'pendente') ON CONFLICT (nutri_id, aluno_id) DO UPDATE SET status = 'pendente', criado_em = NOW() RETURNING id, status`, [profissionalId, req.usuario.id]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("ERRO AO SOLICITAR CONEXAO:", error.message);
    return res.status(500).json({ message: "Erro ao solicitar conexão." });
  }
});

app.get("/api/conexoes/minhas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const result = await db.query(`SELECT 'personal' AS tipo, c.id, c.status, c.criado_em, u.id AS profissional_id, COALESCE(p.nome, u.nome) AS nome, COALESCE(p.cidade, u.cidade) AS cidade, p.sobre_mim AS descricao, p.foto_perfil AS foto, c.permite_treinos AS permite_principal, c.permite_medidas, c.permite_fotos, c.permite_metas FROM conexoes_alunos c JOIN usuarios u ON u.id = c.personal_id LEFT JOIN perfis_personal p ON p.usuario_id = u.id WHERE c.aluno_id = $1 UNION ALL SELECT 'nutricionista', c.id, c.status, c.criado_em, u.id, COALESCE(p.nome, u.nome), COALESCE(p.cidade, u.cidade), p.bio, NULL, c.permite_dietas, c.permite_medidas, c.permite_fotos, c.permite_metas FROM conexoes_nutri c JOIN usuarios u ON u.id = c.nutri_id LEFT JOIN perfis_nutri p ON p.usuario_id = u.id WHERE c.aluno_id = $1 ORDER BY criado_em DESC`, [req.usuario.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR CONEXOES:", error.message);
    return res.status(500).json({ message: "Erro ao buscar conexões." });
  }
});

app.delete("/api/conexoes/:tipo/:id", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { tipo, id } = req.params;
  if (!['personal', 'nutricionista'].includes(tipo) || !/^\d+$/.test(id)) return res.status(400).json({ message: "Conexão inválida." });
  try {
    const tabela = tipo === 'personal' ? 'conexoes_alunos' : 'conexoes_nutri';
    const result = await db.query(`DELETE FROM ${tabela} WHERE id = $1 AND aluno_id = $2 RETURNING id`, [id, req.usuario.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Conexão não encontrada." });
    return res.json({ message: "Conexão encerrada." });
  } catch (error) {
    console.error("ERRO AO ENCERRAR CONEXAO:", error.message);
    return res.status(500).json({ message: "Erro ao encerrar conexão." });
  }
});

// Rotas-isca para varreduras comuns. Não apontam para recursos reais.
const caminhosHoneypot = ["/admin", "/administrator", "/api/admin", "/debug", "/phpmyadmin", "/wp-admin", "/.env", "/config", "/backup"];
app.all(caminhosHoneypot, (req, res) => {
  console.warn(`🍯 Olha que fofinho procurando um atalho em ${req.path}... encontrou o honeypot.`);
  const mensagem = "🍯 Olha que fofinho procurando um atalho... encontrou o honeypot!";
  if (req.accepts("html")) return res.status(418).type("html").send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Honeypot</title><body style="margin:0;background:#080808;color:#fbbf24;font-family:system-ui;display:grid;place-items:center;min-height:100vh;text-align:center"><main><div style="font-size:5rem">🍯</div><h1>${mensagem}</h1><p style="color:#a3a3a3">Esta rota não leva a lugar nenhum.</p></main></body>`);
  return res.status(418).json({ message: mensagem });
});

app.use((req, res) => res.status(404).json({ message: "Rota não encontrada." }));

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ message: "Conteúdo enviado excede o limite permitido." });
  if (error instanceof SyntaxError) return res.status(400).json({ message: "JSON inválido." });
  console.error("ERRO NÃO TRATADO:", error?.message);
  return res.status(500).json({ message: "Erro interno do servidor." });
});
