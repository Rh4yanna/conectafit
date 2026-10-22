import {storageFirebase} from './firebase-storage.js';
import {frontend} from './frontend.js';
import {processarImagens, servirImagem, referenciaImagem} from './imagens-storage.js';
import {painelProfissional} from './painel-profissional.js';
import {localizarEndereco} from './geocodificacao.js';
import { coordenadasValidas } from '../src/utils/localizacao.js';
import { rotasDistanciasAcademias } from './distancias-academias.js';
import {validarProducao} from './configuracao-producao.js';
import {criarSessao,tokenSessao,hashSessao,limparCookie,protegerCsrf} from './sessoes-conta.js';
import {senhaAceitavel,redefinirSenha,emitirRecuperacao} from './seguranca-autenticacao.js';
import {rotasNutricao} from './nutricao.js';
import {rotasQualidade,auditarAtividade,validarPerfilCompartilhado} from './qualidade.js';
import {rotasGestao,convitePublico} from './gestao-profissional.js';
import {rotasAcompanhamento} from './acompanhamento-personal.js';
import {rotasPersonal,enviarDemonstracao,servirVideo} from './personal.js';
import {rotasRotina,criarAtendimento,alterarAtendimento} from './rotina.js';
import { rotasBusca, catalogoServicos, filtrarServicos, solicitarConexao, encerrarConexao } from './servicos.js';
import { rotasEvolucao, resumoMetas, salvarMetas, resumoHidratacao, dataValida } from './evolucao.js';
import { normalizarEndereco } from './enderecos.js';
import { rotasAlimentacao, criarPlano, resumoAlimentacao } from './alimentacao.js';
import { rotasAcademia } from './academia.js';
import {rotasOperacaoAcademia} from './academia-operacao.js';
import { rotasSessoesTreino } from './sessoes-treino.js';
import { rotasBiblioteca, normalizarFicha, diasValidos } from './biblioteca-exercicios.js';
import { resumoTreinos } from './progresso-treinos.js';
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import nodemailer from "nodemailer";
import db from "./db.js";

validarProducao(process.env);
const app = express();
const imagensStorage = storageFirebase();
app.use(auditarAtividade(db));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
// Limita inclusive corpos invalidos e uploads antes de alocar o JSON em memoria.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000');
  try {
    await db.query('SELECT 1');
    res.json({ service: 'conectafit', status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ service: 'conectafit', status: 'unavailable', database: 'unavailable' });
  }
});
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

const producao = process.env.NODE_ENV === 'production';
const origens = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5187').split(',').map(s=>s.trim());
app.use(cors({origin:origens,methods:['GET','POST','PUT','PATCH','DELETE'],credentials:true}));
app.use('/api', protegerCsrf(origens,producao));

// Upload autenticado antes do parser JSON comum; o limite inclui a codificação base64.
app.post('/api/personal/demonstracoes', autenticar, exigirPerfil('personal'), rateLimit({windowMs:3600000,max:30,standardHeaders:true,legacyHeaders:false}), express.json({limit:'15mb',strict:true}), async(req,res)=>{try{res.status(201).json(await enviarDemonstracao(db,req.usuario,req.body));}catch(e){res.status(e.status||500).json({message:e.status?e.message:'Falha ao enviar demonstração.'});}});
app.use("/api/aluno/fotos", express.json({limit:"4mb",strict:true}));
app.use("/api/alimentacao/diario", express.json({limit:"3mb",strict:true}));
app.use(/^\/api\/personal\/alunos\/\d+\/fotos$/, express.json({limit:'4mb',strict:true}));
app.use(express.json({ limit: "1mb", strict: true }));
const prepararImagens = processarImagens(db, imagensStorage);
app.use((req,res,next)=>{
 if(!['POST','PUT','PATCH'].includes(req.method)||!/^\/api\/(aluno\/(perfil|fotos)|personal\/(perfil|alunos\/\d+\/fotos)|nutri\/perfil\/me|academia\/perfil|(alimentacao|dietas)\/diario(?:\/\d+)?)$/.test(req.path.toLowerCase().replace(/\/$/,'')))return next();
 return autenticar(req,res,()=>prepararImagens(req,res,next));
});
app.get('/api/midia/:id', autenticar, servirImagem(db, imagensStorage));
app.use(express.urlencoded({ limit: "100kb", extended: false, parameterLimit: 50 }));
app.use(['/api/personal/perfil','/api/nutri/perfil/me','/api/academia/perfil'],validarPerfilCompartilhado);

app.use('/api', (req, res, next) => {
  if (!['POST','PUT','PATCH'].includes(req.method)) return next();
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({message:'Envie um objeto JSON válido.'});
  }
  const pendentes = [[req.body,0]];
  while (pendentes.length) {
    const [valor,nivel] = pendentes.pop();
    if (nivel > 20) return res.status(400).json({message:'Estrutura de dados muito complexa.'});
    if (valor && typeof valor === 'object') {
      for (const item of Object.values(valor)) pendentes.push([item,nivel+1]);
    }
  }
  next();
});

function valoresTexto(valor) {
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(valoresTexto);
  if (valor && typeof valor === "object") return Object.values(valor).flatMap(valoresTexto);
  return [];
}

const padraoXss = /<\s*script\b|javascript\s*:|on(?:error|load|click|mouseover)\s*=/i;
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && valoresTexto(req.body).some((valor) => padraoXss.test(valor))) {
    console.warn(`🧯 Tentativa com padrão de XSS neutralizada em ${req.path}.`);
    return res.status(400).json({
      securityEvent: "xss",
      message: "O conteúdo enviado não é permitido. Revise os campos e tente novamente.",
    });
  }
  return next();
});

const limiterAcessos = rateLimit({
  windowMs: 30 * 1000,
  max: 4,
  handler: (_req, res) => res.status(429).json({
    securityEvent: "brute-force",
    retryAfter: 30,
    message: "Muitas tentativas em pouco tempo. Aguarde 30 segundos e tente novamente.",
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/login", limiterAcessos);
app.use("/api/cadastro", rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false }));



const limiterRecuperacao = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.use("/api/senha", limiterRecuperacao);

const respostaRecuperacao = { message: "Se houver uma conta com este e-mail, enviaremos as instruções de recuperação." };

// Campo-isca: visitantes reais não o enxergam nem devem preenchê-lo.
function honeypotPreenchido(req) {
  return typeof req.body?.website === "string" && req.body.website.trim().length > 0;
}

function registrarHoneypot(acao) {
  console.info(`Tentativa automatizada bloqueada: ${acao}.`);
}

app.post("/api/senha/recuperar", async (req, res) => {
  if (honeypotPreenchido(req)) {
    registrarHoneypot("uma recuperação de senha");
    return res.json({ honeypot: true, message: "Se houver uma conta correspondente, você receberá as instruções de recuperação." });
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
    await emitirRecuperacao(db, usuario.rows[0].id, tokenHash);
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha?token=${token}`;
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    await transporter.sendMail({ from: process.env.GMAIL_USER, to: email, subject: "Recuperação de senha — ConectaFit", text: `Olá ${usuario.rows[0].nome}, use este link em até 30 minutos: ${link}` });
    return res.json(respostaRecuperacao);
  } catch (error) { console.error("ERRO RECUPERACAO:", error.code || 'erro interno'); return res.json(respostaRecuperacao); }
});

app.post("/api/senha/redefinir", async (req, res) => {
  const { token, senha } = req.body;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || typeof senha !== "string" || senha.length > 128) return res.status(400).json({ message: "Link ou senha inválidos." });
  if (typeof token !== "string" || typeof senha !== "string" || senha.length < 8) return res.status(400).json({ message: "Link ou senha inválidos. Use pelo menos 8 caracteres." });
  if (!senhaAceitavel(senha)) return res.status(400).json({ message: "Use pelo menos 8 caracteres e no máximo 72 bytes na senha." });
  try {
    if (!await redefinirSenha(db, token, senha)) return res.status(400).json({ message: "Link inválido ou expirado." });
    return res.json({ message: "Senha redefinida com sucesso. Entre novamente nos seus dispositivos." });
  } catch { return res.status(500).json({ message: "Erro ao redefinir senha." }); }
});

async function autenticar(req, res, next) {
  const token=tokenSessao(req,producao);
  if(!token)return res.status(401).json({message:'Autenticação obrigatória.'});
  try {
    const atual=await db.query(`SELECT u.id,u.email,u.tipo_usuario,u.nome,u.versao_sessao FROM sessoes_conta s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=$1 AND s.revogada_em IS NULL AND s.expira_em>NOW() AND s.versao_sessao=u.versao_sessao`,[hashSessao(token)]);
    if(!atual.rows.length){return res.status(401).json({message:'Sessão inválida ou expirada. Entre novamente.'});}
    req.usuario=atual.rows[0];
    return next();
  } catch { return res.status(503).json({message:'Não foi possível verificar a sessão. Tente novamente.'}); }
}
app.post('/api/logout', async(req,res)=>{
  try {
    const token=tokenSessao(req,producao);
    if(token)await db.query('UPDATE sessoes_conta SET revogada_em=NOW() WHERE token_hash=$1 AND revogada_em IS NULL',[hashSessao(token)]);
    limparCookie(res,producao);
    return res.json({message:'Sessão encerrada.'});
  } catch { return res.status(503).json({message:'Não foi possível encerrar a sessão no servidor. Tente novamente.'}); }
});

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
    return res.status(201).json({ honeypot: true, message: "Solicitação recebida." });
  }
  const { nome, email, senha, tipo_usuario } = req.body;
  if (typeof nome !== "string" || nome.trim().length < 3 || nome.trim().length > 120 || typeof email !== "string" || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || !senhaAceitavel(senha) || typeof tipo_usuario !== "string") return res.status(400).json({ message: "Dados de cadastro inválidos." });

  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ message: "Todos os campos são obrigatórios." });
  }

  const emailTratado = email.trim().toLowerCase();
  let tipoTratado = tipo_usuario.trim().toLowerCase();
  if (tipoTratado === "nutricionista") tipoTratado = "nutri";
  if (!["aluno", "personal", "nutri", "academia"].includes(tipoTratado)) return res.status(400).json({ message: "Tipo de perfil inválido." });

  try {
    const checagem = await db.query(
      "SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = $1 AND LOWER(TRIM(tipo_usuario)) = $2",
      [emailTratado, tipoTratado]
    );

    if (checagem.rows.length > 0) {
      return res.status(400).json({ message: "Este e-mail já está cadastrado neste tipo de perfil." });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

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
    if (error.code === "23505") return res.status(409).json({ message: "Este e-mail já está cadastrado neste tipo de perfil. Entre na sua conta ou recupere sua senha." });
    console.error("ERRO NO CADASTRO:", error.code || 'erro interno');
    return res.status(500).json({ message: "Erro ao processar o cadastro." });
  }
});

// ROTA DE LOGIN
app.post("/api/login", async (req, res) => {
  const { email, senha, tipo_usuario } = req.body;
  const padraoSqlInjection = /(?:'\s*or\s*'?(?:1|x)'?\s*=\s*'?(?:1|x)|\bor\s+1\s*=\s*1\b|\bunion\s+(?:all\s+)?select\b|;\s*drop\s+table\b|--\s*$)/i;
  if ([email, senha].some((valor) => typeof valor === "string" && padraoSqlInjection.test(valor))) {
    console.warn("🛡️ Padrão clássico de SQL Injection bloqueado no login.");
    return res.status(400).json({
      securityEvent: "sqli",
      message: "Dados de acesso inválidos. Revise os campos.",
    });
  }
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
      "SELECT id, nome, email, senha_hash, tipo_usuario, cidade, foto_url, versao_sessao FROM usuarios WHERE LOWER(email) = $1 AND LOWER(tipo_usuario) = $2",
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

    await criarSessao(db,usuario,req,res,producao);
    delete usuario.versao_sessao;

    return res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario,
    });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error.code || 'erro interno');
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
  } catch {
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
    console.error("ERRO AO BUSCAR PERFIL DO PERSONAL:", error.code || 'erro interno');
    return res.status(500).json({ message: "Erro ao buscar dados do perfil." });
  }
});

app.post("/api/personal/perfil", autenticar, exigirPerfil("personal"), forcarUsuarioAutenticado, async (req, res) => {
  const {
    nome, foto_perfil, contato, whatsapp, instagram, 
    formacao, sobre_mim, cidade, preco_diaria, preco_semanal, preco_mensal, preco_anual, email_contato
  } = req.body;

  if (email_contato && (typeof email_contato!=='string'||email_contato.length>254||!/^\S+@\S+\.\S+$/.test(email_contato))) return res.status(400).json({message:'Informe um e-mail de contato valido.'});
  if (!nome) {
    return res.status(400).json({ message: "O nome é obrigatório." });
  }

  try {
    const usuario_id = req.usuario.id;

    const query = `
      INSERT INTO perfis_personal 
        (usuario_id, nome, foto_perfil, contato, whatsapp, instagram, formacao, sobre_mim, cidade, preco_diaria, preco_semanal, preco_mensal, preco_anual,email_contato)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14)
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
        preco_anual = EXCLUDED.preco_anual, email_contato=EXCLUDED.email_contato
      RETURNING *;
    `;

    const values = [
      usuario_id, nome, foto_perfil || null, contato || null, whatsapp || null,
      instagram || null, formacao || null, sobre_mim || null, cidade || null,
      preco_diaria === ''?null:preco_diaria??null, preco_semanal === ''?null:preco_semanal??null, preco_mensal === ''?null:preco_mensal??null, preco_anual === ''?null:preco_anual??null,email_contato||null
    ];

    const result = await db.query(query, values);
    return res.status(200).json({
      message: "Perfil atualizado com sucesso!",
      perfil: result.rows[0],
    });
  } catch (error) {
    console.error("ERRO AO SALVAR PERFIL DO PERSONAL:", error.code || 'erro interno');
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
    console.error("ERRO AO BUSCAR PERFIL DA ACADEMIA:", error.code || 'erro interno');
    return res.status(500).json({ message: "Erro ao buscar dados da academia." });
  }
});

app.post("/api/academia/perfil", autenticar, exigirPerfil("academia"), forcarUsuarioAutenticado, async (req, res) => {
  const { nome, email, razao_social, cnpj, telefone, cidade, endereco, whatsapp, instagram, bio, fotos, foto_perfil, preco_diaria, preco_mensal, preco_anual, modalidades, videos } = req.body;
  if(razao_social!=null&&(typeof razao_social!=='string'||razao_social.length>300))return res.status(400).json({message:'Confira a razao social (ate 300 caracteres).'});
  if(foto_perfil && !referenciaImagem(foto_perfil) && (typeof foto_perfil!=='string'||foto_perfil.length>850000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(foto_perfil)))return res.status(400).json({message:'Selecione uma foto PNG, JPEG ou WebP de até 600 KB.'});

  const client = await db.connect();

  try {
    const usuario_id = req.usuario.id;

    await client.query('BEGIN');

    const query = `
      INSERT INTO perfis_academia (usuario_id, nome, email, cnpj, telefone, cidade, endereco, bio, preco_diaria, preco_mensal, preco_anual, modalidades, videos, whatsapp, instagram,foto_perfil,razao_social)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,$16,$17)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        cnpj = EXCLUDED.cnpj,
        telefone = EXCLUDED.telefone,
        cidade = EXCLUDED.cidade,
        endereco = EXCLUDED.endereco,
        bio = EXCLUDED.bio,
        preco_diaria = EXCLUDED.preco_diaria, preco_mensal = EXCLUDED.preco_mensal,
        preco_anual = EXCLUDED.preco_anual, modalidades = EXCLUDED.modalidades, videos = EXCLUDED.videos, whatsapp = EXCLUDED.whatsapp, instagram = EXCLUDED.instagram, foto_perfil=EXCLUDED.foto_perfil, razao_social=EXCLUDED.razao_social
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
      JSON.stringify(Array.isArray(modalidades) ? modalidades : []), JSON.stringify(Array.isArray(videos) ? videos : []), whatsapp?.trim() || null, instagram?.trim() || null, foto_perfil||null,razao_social?.trim()||null
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
    console.error("ERRO AO SALVAR ACADEMIA:", error.code || 'erro interno');
    return res.status(500).json({ message: "Não foi possível salvar os dados da academia." });
  } finally {
    client.release();
  }
});

// ==========================================
// TRATAMENTO DE USUÁRIO E ROTAS DE TREINOS
// ==========================================

app.get("/api/usuario/me", autenticar, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome, email, tipo_usuario, telefone, cidade, foto_url FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Sessão sem usuário válido." });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("ERRO AO BUSCAR USUARIO ATUAL:", error.code || 'erro interno');
    return res.status(500).json({ message: "Erro ao buscar usuário atual." });
  }
});

function treinoValido(titulo, exercicios) {
  return typeof titulo === "string" && titulo.trim().length > 0 && titulo.trim().length <= 120 &&
    Array.isArray(exercicios) && exercicios.length > 0 && exercicios.length <= 50 &&
    exercicios.every((exercicio) => typeof exercicio?.nome === "string" && exercicio.nome.trim().length > 0 && exercicio.nome.trim().length <= 120 &&
      Number.isInteger(Number(exercicio.series)) && Number(exercicio.series) >= 1 && Number(exercicio.series) <= 30);
}

// BUSCAR TREINOS
app.use('/api/sessoes-treino', autenticar, exigirPerfil('aluno'), rotasSessoesTreino(db));
app.use('/api/acompanhamento', autenticar, exigirPerfil('aluno','personal'), rotasAcompanhamento(db));
app.get('/api/convites/:token', convitePublico(db));
app.use('/api/gestao', autenticar, exigirPerfil('aluno','personal','nutri'), rotasGestao(db));
app.use('/api/nutricao', autenticar, exigirPerfil('aluno','nutri'), rotasNutricao(db));
app.use('/api/personal', autenticar, exigirPerfil('personal'), rotasPersonal(db));
app.get('/api/demonstracoes/:id/video', autenticar, exigirPerfil('aluno','personal'), (q,s)=>servirVideo(db,q,s));
app.use('/api/exercicios', autenticar, exigirPerfil('aluno','personal'), rotasBiblioteca());
app.get("/api/treinos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM treinos WHERE usuario_id = $1 AND NOT arquivada ORDER BY criado_em DESC",
      [req.usuario.id]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR TREINOS:", error.code || 'erro interno');
    return res.status(500).json({ message: "Não foi possível buscar os treinos." });
  }
});

// CRIAR UM NOVO TREINO
app.post("/api/treinos", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { titulo, exercicios, dias_semana = [] } = req.body;

  if (!treinoValido(titulo, exercicios) || !diasValidos(dias_semana)) {
    return res.status(400).json({ message: "Dados do treino inválidos." });
  }

  if (!titulo) {
    return res.status(400).json({ message: "O título do treino é obrigatório." });
  }

  try {
    const result = await db.query(
      `INSERT INTO treinos (usuario_id, titulo, exercicios, origem, criado_por, dias_semana)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.usuario.id, titulo.trim(), JSON.stringify(normalizarFicha(exercicios, [], true)), "aluno", req.usuario.nome || null, dias_semana]
    );

    return res.status(201).json({
      message: "Treino criado com sucesso!",
      treino: result.rows[0],
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message});
    console.error("ERRO AO CRIAR TREINO:", error.code || 'erro interno');
    return res.status(500).json({ message: "Não foi possível criar o treino." });
  }
});

// ATUALIZAR UM TREINO EXISTENTE
app.put("/api/treinos/:id", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const treinoId = req.params.id;
  const { titulo, exercicios, dias_semana = [] } = req.body;

  if (!/^\d+$/.test(treinoId) || !treinoValido(titulo, exercicios) || !diasValidos(dias_semana)) {
    return res.status(400).json({ message: "Dados do treino inválidos." });
  }

  try {
    const anterior = await db.query('SELECT exercicios,origem FROM treinos WHERE id=$1 AND usuario_id=$2', [treinoId,req.usuario.id]);
    if (!anterior.rows.length) return res.status(404).json({message:'Ficha inexistente.'});
    if(anterior.rows[0].origem!=='aluno')return res.status(403).json({message:'Somente o personal responsável pode revisar esta prescrição.'});
    const result = await db.query(
      `UPDATE treinos 
       SET titulo = $1, exercicios = $2, origem = $3, criado_por = $4, dias_semana = $7
       WHERE id = $5 AND usuario_id = $6 AND origem = 'aluno'
       RETURNING *`,
      [titulo.trim(), JSON.stringify(normalizarFicha(exercicios, anterior.rows[0].exercicios, true)), "aluno", req.usuario.nome || null, treinoId, req.usuario.id, dias_semana]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Treino não encontrado." });
    }

    return res.status(200).json({
      message: "Treino atualizado com sucesso!",
      treino: result.rows[0],
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message});
    console.error("ERRO AO ATUALIZAR TREINO:", error.code || 'erro interno');
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
      "DELETE FROM treinos WHERE id = $1 AND usuario_id = $2 AND origem = 'aluno' RETURNING *",
      [treinoId, req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Treino não encontrado." });
    }

    return res.status(200).json({ message: "Treino excluído com sucesso!" });
  } catch (error) {
    console.error("ERRO AO DELETAR TREINO:", error.code || 'erro interno');
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
      COUNT(*) FILTER (WHERE status='aceito' AND ativo)::int AS alunos_ativos,
      COUNT(*) FILTER (WHERE status='pendente')::int AS solicitacoes_pendentes,
      (SELECT COUNT(*)::int FROM visitas_perfil WHERE perfil_usuario_id=$1) AS visitas,
      (SELECT COUNT(*)::int FROM agenda_profissional WHERE profissional_id=$1 AND data=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date AND status IN ('pendente','confirmado','remarcacao')) + (SELECT COUNT(*)::int FROM compromissos_profissionais WHERE profissional_id=$1 AND data=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date) AS compromissos_hoje
      FROM ${tabela} WHERE ${coluna}=$1`, [req.usuario.id]);
    if (req.usuario.tipo_usuario === 'personal') {
      const fichas = await db.query('SELECT COUNT(*)::int AS total FROM treinos WHERE personal_id=$1', [req.usuario.id]);
      const pendentes = await db.query(`SELECT u.id,u.nome FROM conexoes_alunos c JOIN usuarios u ON u.id=c.aluno_id
        WHERE c.personal_id=$1 AND c.status='aceito' AND c.ativo
        AND NOT EXISTS (SELECT 1 FROM treinos t WHERE t.usuario_id=c.aluno_id AND t.personal_id=$1) ORDER BY u.nome`, [req.usuario.id]);
      r.rows[0].fichas_criadas = fichas.rows[0].total;
      r.rows[0].alunos_sem_ficha = pendentes.rows;
    }
    return res.json(r.rows[0]);
  } catch (error) { console.error("ERRO DASH PROFISSIONAL:", error.code || 'erro interno'); return res.status(500).json({ message: "Erro ao carregar indicadores." }); }
});

app.get("/api/profissional/solicitacoes", autenticar, exigirPerfil("personal", "nutri"), async (req, res) => {
  const tabela = req.usuario.tipo_usuario === "personal" ? "conexoes_alunos" : "conexoes_nutri";
  const coluna = req.usuario.tipo_usuario === "personal" ? "personal_id" : "nutri_id";
  try { const r=await db.query(`SELECT c.id,c.criado_em,c.interesse,u.id AS aluno_id,u.nome,u.email,u.telefone FROM ${tabela} c JOIN usuarios u ON u.id=c.aluno_id WHERE c.${coluna}=$1 AND c.status='pendente' ORDER BY c.criado_em`,[req.usuario.id]); return res.json(r.rows); }
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
  try{const r=await db.query(`SELECT u.id,u.nome,u.email,u.telefone,u.cidade,u.foto_url,c.id AS conexao_id,c.ativo,c.permite_medidas,c.permite_fotos,c.permite_metas,${personal?'c.permite_treinos':'c.permite_dietas'} AS permite_principal FROM ${tabela} c JOIN usuarios u ON u.id=c.aluno_id WHERE c.${coluna}=$1 AND c.status='aceito' AND (c.ativo OR $2) ORDER BY u.nome`,[req.usuario.id,req.query.incluir_inativos==='true']);return res.json(r.rows)}catch{return res.status(500).json({message:"Erro ao buscar alunos."})}
});

app.get("/api/profissional/alunos/:id", autenticar, exigirPerfil("personal", "nutri"), async (req,res)=>{
  const personal=req.usuario.tipo_usuario==="personal", tabela=personal?"conexoes_alunos":"conexoes_nutri", coluna=personal?"personal_id":"nutri_id";
  try{const acesso=await db.query(`SELECT permite_medidas,permite_fotos,permite_metas,${personal?'permite_treinos':'permite_dietas'} AS permite_principal FROM ${tabela} WHERE ${coluna}=$1 AND aluno_id=$2 AND status='aceito' AND ativo`,[req.usuario.id,req.params.id]);if(!acesso.rows.length)return res.status(404).json({message:"Aluno não conectado."});const p=acesso.rows[0];const usuario=await db.query("SELECT id,nome,email,telefone,cidade,foto_url FROM usuarios WHERE id=$1",[req.params.id]);const dados={usuario:usuario.rows[0],permissoes:p};if(p.permite_medidas)dados.medidas=(await db.query("SELECT * FROM medidas_aluno WHERE aluno_id=$1 ORDER BY data_medicao DESC",[req.params.id])).rows;if(p.permite_fotos)dados.fotos=(await db.query("SELECT * FROM fotos_evolucao WHERE aluno_id=$1 ORDER BY data_registro DESC",[req.params.id])).rows;if(p.permite_metas)dados.metas=(await db.query("SELECT * FROM metas_aluno WHERE aluno_id=$1",[req.params.id])).rows[0]||null;if(p.permite_principal)dados.planos=(await db.query(personal?"SELECT * FROM treinos WHERE usuario_id=$1 ORDER BY criado_em DESC":"SELECT * FROM planos_alimentares WHERE aluno_id=$1 ORDER BY criado_em DESC",[req.params.id])).rows;return res.json(dados)}catch(error){console.error("ERRO ALUNO PROF:",error.code || 'erro interno');return res.status(500).json({message:"Erro ao carregar aluno."})}
});

app.post("/api/profissional/alunos/:id/planos", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{
  if(req.usuario.tipo_usuario==='personal')return res.status(400).json({message:'Use o editor de fichas para publicar exercícios com vídeos de execução.'});
  try{return res.status(201).json(await criarPlano(db,req.usuario,req.body,req.params.id));}
  catch(e){return res.status(e.status||500).json({message:e.status?e.message:'Falha ao salvar plano.'});}
});

app.get("/api/profissional/agenda", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{try{const r=await db.query("SELECT *, to_char(data,'YYYY-MM-DD') AS data FROM agenda_profissional WHERE profissional_id=$1 ORDER BY agenda_profissional.data,hora_inicio",[req.usuario.id]);return res.json(r.rows)}catch{return res.status(500).json({message:"Erro ao buscar agenda."})}});
app.post("/api/profissional/agenda", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{try{res.status(201).json(await criarAtendimento(db,req.usuario,req.body));}catch(e){res.status(e.status||500).json({message:e.status?e.message:'Erro ao salvar atendimento.'});}});

app.patch('/api/profissional/alunos/:id/ativo', autenticar, exigirPerfil('personal','nutri'), async(req,res)=>{
  if (typeof req.body.ativo !== 'boolean' || !/^\d+$/.test(req.params.id)) return res.status(400).json({message:'Status inválido.'});
  const personal=req.usuario.tipo_usuario==='personal';
  try {
    const r=await db.query(`UPDATE ${personal?'conexoes_alunos':'conexoes_nutri'} SET ativo=$1
      WHERE ${personal?'personal_id':'nutri_id'}=$2 AND aluno_id=$3 AND status='aceito' RETURNING ativo`,[req.body.ativo,req.usuario.id,req.params.id]);
    if(!r.rows.length)return res.status(404).json({message:'Vínculo não encontrado.'});
    return res.json(r.rows[0]);
  } catch { return res.status(500).json({message:'Não foi possível atualizar o vínculo.'}); }
});

app.delete("/api/profissional/agenda/:id", autenticar, exigirPerfil("personal","nutri"), async(req,res)=>{try{res.json(await alterarAtendimento(db,req.usuario,req.params.id,{...req.body,acao:'cancelar'}));}catch(e){res.status(e.status||500).json({message:e.status?e.message:'Erro ao cancelar atendimento.'});}});

app.get("/api/nutri/perfil/me", autenticar, exigirPerfil("nutri"), async(req,res)=>{try{const r=await db.query("SELECT p.*,u.email FROM perfis_nutri p JOIN usuarios u ON u.id=p.usuario_id WHERE p.usuario_id=$1",[req.usuario.id]);return res.json(r.rows[0]||null)}catch{return res.status(500).json({message:"Erro ao buscar perfil."})}});
app.put("/api/nutri/perfil/me", autenticar, exigirPerfil("nutri"), async(req,res)=>{const p=req.body;if(p.email_contato&&(typeof p.email_contato!=='string'||p.email_contato.length>254||!/^\S+@\S+\.\S+$/.test(p.email_contato)))return res.status(400).json({message:'Informe um e-mail de contato valido.'});try{const r=await db.query(`INSERT INTO perfis_nutri(usuario_id,nome,crn,bio,cidade,contato,foto_perfil,whatsapp,instagram,formacao,preco_diaria,preco_semanal,preco_mensal,preco_anual,email_contato) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(usuario_id) DO UPDATE SET nome=$2,crn=$3,bio=$4,cidade=$5,contato=$6,foto_perfil=$7,whatsapp=$8,instagram=$9,formacao=$10,preco_diaria=$11,preco_semanal=$12,preco_mensal=$13,preco_anual=$14,email_contato=$15,atualizado_em=NOW() RETURNING *`,[req.usuario.id,p.nome,p.crn||null,p.bio||null,p.cidade||null,p.contato||null,p.foto_perfil||null,p.whatsapp||null,p.instagram||null,p.formacao||null,p.preco_diaria===''?null:p.preco_diaria??null,p.preco_semanal===''?null:p.preco_semanal??null,p.preco_mensal===''?null:p.preco_mensal??null,p.preco_anual===''?null:p.preco_anual??null,p.email_contato||null]);return res.json(r.rows[0])}catch{return res.status(400).json({message:"Não foi possível salvar o perfil."})}});

app.get("/api/servicos/:tipo/:id", autenticar, exigirPerfil("aluno"), async(req,res)=>{try{const perfil=(await catalogoServicos(db)).find(p=>p.id===req.params.id&&p.tipo===req.params.tipo);if(!perfil)return res.status(404).json({message:"Perfil indisponível."});await db.query("INSERT INTO visitas_perfil(perfil_usuario_id,visitante_id) VALUES($1,$2)",[perfil.id,req.usuario.id]);res.json(perfil);}catch{res.status(500).json({message:"Erro ao abrir perfil."});}});

app.use('/api/operacao-academia', autenticar, rotasOperacaoAcademia(db));
app.use('/api/academia', autenticar, exigirPerfil('academia'), rotasAcademia(db));

app.get("/api/academia/dashboard", autenticar, exigirPerfil("academia"), async(req,res)=>{try{const r=await db.query("SELECT COUNT(*)::int AS visitas, COUNT(*) FILTER (WHERE visitado_em >= date_trunc('month',CURRENT_DATE))::int AS visitas_mes FROM visitas_perfil WHERE perfil_usuario_id=$1",[req.usuario.id]);return res.json(r.rows[0])}catch{return res.status(500).json({message:"Erro ao carregar visitas."})}});

// Evolução, perfil e metas do aluno
app.get("/api/aluno/resumo", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM conexoes_alunos WHERE aluno_id=$1 AND status='aceito' AND ativo) +
        (SELECT COUNT(*)::int FROM conexoes_nutri WHERE aluno_id=$1 AND status='aceito' AND ativo) AS conexoes,
        COALESCE(m.agua_litros, 2) AS agua_meta, COALESCE(m.treinos_semana, 3) AS treinos_meta,
        COALESCE(m.refeicoes_semana, 14) AS refeicoes_meta,
        COALESCE(p.agua_litros, 0) AS agua_atual, COALESCE(p.treinos_concluidos, 0) AS treinos_atual,
        COALESCE(p.refeicoes_corretas, 0) AS refeicoes_atual
      FROM (SELECT 1) base
      LEFT JOIN metas_aluno m ON m.aluno_id=$1
      LEFT JOIN progresso_semanal p ON p.aluno_id=$1 AND p.semana=date_trunc('week', CURRENT_DATE)::date`, [req.usuario.id]);
    const [refeicao] = await Promise.all([
      db.query("SELECT r.nome,r.horario,r.descricao AS detalhes FROM refeicoes_plano r JOIN planos_alimentares p ON p.id=r.plano_id WHERE p.aluno_id=$1 AND p.ativo=TRUE AND p.vigente=TRUE AND p.excluido_em IS NULL ORDER BY r.horario NULLS LAST LIMIT 1",[req.usuario.id])
    ]);
    const automatico = await resumoTreinos(db, req.usuario.id);
    return res.json({...resultado.rows[0],agua_atual:(await resumoHidratacao(db,req.usuario.id)).hoje_ml/1000,treinos_atual:automatico.concluidos,refeicoes_atual:await resumoAlimentacao(db,req.usuario.id),treinos:automatico,proximo_treino:automatico.treinos_hoje.find(t=>!t.concluido_hoje)||null,proxima_refeicao:refeicao.rows[0]||null});
  } catch (error) { console.error("ERRO RESUMO:", error.code || 'erro interno'); return res.status(500).json({ message: "Erro ao carregar dashboard." }); }
});

app.use('/api/qualidade', autenticar, rotasQualidade(db));
app.use('/api/rotina', autenticar, exigirPerfil('aluno','personal','nutri','academia'), (q,s,n)=>q.usuario.tipo_usuario!=='academia'||/^\/(notificacoes|preferencias)(\/|$)/.test(q.path)?n():s.status(403).json({message:'Recurso indisponível para este perfil.'}), rotasRotina(db));
app.use('/api/busca', autenticar, exigirPerfil('aluno','personal','nutri','academia'), rotasBusca(db));
app.use('/api/evolucao', autenticar, exigirPerfil('aluno','personal','nutri'), rotasEvolucao(db));
app.get('/api/aluno/metas', autenticar, exigirPerfil('aluno'), async(req,res)=>{
  try{return res.json(await resumoMetas(db,req.usuario.id));}catch{return res.status(500).json({message:'Falha ao carregar metas.'});}
});
app.put('/api/aluno/metas', autenticar, exigirPerfil('aluno'), async(req,res)=>{
  try{return res.json(await salvarMetas(db,req.usuario,req.body));}catch(e){return res.status(e.status||500).json({message:e.status?e.message:'Falha ao salvar metas.'});}
});
// Compatibilidade: o progresso agora vem dos registros; esta rota n?o grava totais manuais.
app.put('/api/aluno/progresso', autenticar, exigirPerfil('aluno'), async(req,res)=>{
  try{return res.json((await resumoMetas(db,req.usuario.id)).progresso);}catch{return res.status(500).json({message:'Falha ao carregar progresso.'});}
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
  const limites={peso:500,altura:300,cintura:300,quadril:300,braco_direito:150,braco_esquerdo:150,percentual_gordura:100};
  const valores=Object.entries(limites).filter(([campo])=>req.body[campo]!==undefined&&req.body[campo]!==null&&req.body[campo]!=='');
  if(!valores.length||valores.some(([campo,max])=>!['number','string'].includes(typeof req.body[campo])||!Number.isFinite(Number(req.body[campo]))||Number(req.body[campo])<=0||Number(req.body[campo])>max)||!dataValida(data_medicao))return res.status(400).json({message:'Informe uma data e pelo menos uma medida positiva válida.'});
  if(observacoes!=null&&(typeof observacoes!=='string'||observacoes.length>2000))return res.status(400).json({message:'Use até 2000 caracteres nas observações.'});
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
  const imagens=[frente_url,costas_url,lado_esquerdo_url,lado_direito_url].filter(v=>v!=null&&v!=='');
  const imagemValida=valor=>{
    if(referenciaImagem(valor))return true;
    if(typeof valor!=='string'||valor.length>900000)return false;
    const match=valor.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if(!match)return false;
    const bytes=Buffer.from(match[2],'base64');
    return match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  };
  if(!dataValida(data_registro)||!imagens.length||!imagens.every(imagemValida))return res.status(400).json({message:'Selecione uma data e fotos JPG, PNG ou WebP válidas.'});
  try {
    const resultado = await db.query(`INSERT INTO fotos_evolucao
      (aluno_id,data_registro,frente_url,costas_url,lado_esquerdo_url,lado_direito_url)
      VALUES ($1,COALESCE($2::date,CURRENT_DATE),$3,$4,$5,$6) ON CONFLICT (aluno_id,data_registro) DO UPDATE SET
      autor_personal_id=NULL,consentimento_em=NULL,frente_url=COALESCE($3,fotos_evolucao.frente_url),costas_url=COALESCE($4,fotos_evolucao.costas_url),lado_esquerdo_url=COALESCE($5,fotos_evolucao.lado_esquerdo_url),lado_direito_url=COALESCE($6,fotos_evolucao.lado_direito_url) RETURNING *`,
      [req.usuario.id,data_registro||null,frente_url||null,costas_url||null,lado_esquerdo_url||null,lado_direito_url||null]);
    return res.status(201).json(resultado.rows[0]);
  } catch { return res.status(400).json({ message: "Não foi possível registrar as fotos." }); }
});

app.put("/api/conexoes/:tipo/:id/permissoes", autenticar, exigirPerfil("aluno"), async (req, res) => {
  const { tipo, id } = req.params;
  if (!['personal','nutricionista'].includes(tipo) || !/^\d+$/.test(id)) return res.status(400).json({ message: "Conexão inválida." });
  const tabela = tipo === 'personal' ? 'conexoes_alunos' : 'conexoes_nutri';
  const primeira = tipo === 'personal' ? 'permite_treinos' : 'permite_dietas';
  if(['permite_diario','permite_fotos_refeicoes'].some(k=>req.body[k]!==undefined&&typeof req.body[k]!=='boolean'))return res.status(400).json({message:'Permissão inválida.'});
  if ([primeira,'permite_medidas','permite_fotos','permite_metas'].some(campo => typeof req.body[campo] !== 'boolean')) {
    return res.status(400).json({message:'As permissões devem ser verdadeiras ou falsas.'});
  }
  try {
    const r = await db.query(`UPDATE ${tabela} SET ${primeira}=$1, permite_medidas=$2, permite_fotos=$3, permite_metas=$4 ${tipo==='nutricionista'?',permite_diario=COALESCE($7,permite_diario),permite_fotos_refeicoes=COALESCE($8,permite_fotos_refeicoes)':''} WHERE id=$5 AND aluno_id=$6 AND status='aceito' RETURNING *`,
      [Boolean(req.body[primeira]),Boolean(req.body.permite_medidas),Boolean(req.body.permite_fotos),Boolean(req.body.permite_metas),id,req.usuario.id,...(tipo==='nutricionista'?[req.body.permite_diario??null,req.body.permite_fotos_refeicoes??null]:[])]);
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

app.listen(Number(process.env.PORT || 3000), process.env.BIND_HOST || (producao ? "127.0.0.1" : "0.0.0.0"), () => {
  console.log(`Backend rodando na porta ${Number(process.env.PORT || 3000)}`);
});

const alimentacao = rotasAlimentacao(db);
app.use('/api/alimentacao', autenticar, exigirPerfil('aluno','nutri'), alimentacao);
// Compatibilidade com clientes antigos, mantendo as mesmas regras de autoria e vers?o.
app.use('/api/dietas', autenticar, exigirPerfil('aluno'), (req, _res, next) => {
  req.url = req.url.replace(/^\/minha(?=\?|$)/, '/planos');
  if (!req.url.startsWith('/planos')) req.url = '/planos' + (req.url === '/' ? '' : req.url);
  next();
}, alimentacao);

app.use('/api/profissional/painel',autenticar,exigirPerfil('personal','nutri'),painelProfissional(db));

app.use('/api/academias/distancias', autenticar, exigirPerfil('aluno'), rotasDistanciasAcademias(db));

app.post('/api/servico/localizacao/buscar', autenticar, exigirPerfil('academia'), rateLimit({windowMs:60000,max:10,keyGenerator:req=>String(req.usuario.id),message:{message:'Aguarde um minuto antes de buscar novamente.'}}), async(req,res)=>{
 try{normalizarEndereco(req.body);}catch(e){return res.status(400).json({message:e.message});}
 try{res.set('Cache-Control','no-store').json({resultados:await localizarEndereco(req.body,process.env.GEOAPIFY_API_KEY)});}catch(e){res.status(e.status||502).json({message:e.message});}
});

app.get('/api/servico/localizacao', autenticar, exigirPerfil('personal','nutri','academia'), async(req,res)=>{
  try {
    const r=await db.query('SELECT cidade,rua,numero,estado,latitude,longitude,latitude IS NOT NULL AS localizado FROM localizacoes_servicos WHERE usuario_id=$1',[req.usuario.id]);
    return res.json(r.rows[0]||null);
  }catch{return res.status(500).json({message:'Não foi possível carregar a localização.'});}
});
app.put('/api/servico/localizacao', autenticar, exigirPerfil('personal','nutri','academia'), async(req,res)=>{
  let endereco;
  try{endereco=normalizarEndereco(req.body);}catch(error){return res.status(400).json({message:error.message});}
  const {latitude,longitude}=req.body;
  const temCoordenadas=latitude!=null&&latitude!==''||longitude!=null&&longitude!=='';
  if(temCoordenadas&&!coordenadasValidas(latitude,longitude))return res.status(400).json({message:'Informe latitude e longitude válidas.'});
  const lat=temCoordenadas?Number(latitude):null,lng=temCoordenadas?Number(longitude):null;
  let client;
  try{
    client=await db.connect();await client.query('BEGIN');
    await client.query(`INSERT INTO localizacoes_servicos(usuario_id,cidade,rua,numero,estado,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(usuario_id) DO UPDATE SET cidade=$2,rua=$3,numero=$4,estado=$5,latitude=$6,longitude=$7,atualizado_em=NOW()`,[req.usuario.id,endereco.cidade,endereco.rua,endereco.numero,endereco.estado,lat,lng]);
    await client.query('UPDATE usuarios SET cidade=$1 WHERE id=$2',[endereco.cidade,req.usuario.id]);
    const tabela={personal:'perfis_personal',nutri:'perfis_nutri',academia:'perfis_academia'}[req.usuario.tipo_usuario];
    await client.query(`UPDATE ${tabela} SET cidade=$1 WHERE usuario_id=$2`,[endereco.cidade,req.usuario.id]);
    await client.query('COMMIT');
    return res.json({...endereco,latitude:lat,longitude:lng,localizado:lat!==null,message:'Endereço salvo com sucesso.'});
  }catch{if(client)await client.query('ROLLBACK').catch(()=>{});return res.status(500).json({message:'Não foi possível salvar o endereço.'});}
  finally{client?.release();}
});

app.get("/api/servicos", autenticar, exigirPerfil("aluno"), async(req,res)=>{try{res.json(filtrarServicos(await catalogoServicos(db),req.query));}catch(e){res.status(e.status||500).json({message:e.status?e.message:"Erro ao buscar serviços."});}});
app.post("/api/conexoes", autenticar, exigirPerfil("aluno"), async(req,res)=>{try{const r=await solicitarConexao(db,req.usuario.id,req.body);res.status(r.existente?200:201).json(r);}catch(e){res.status(e.status||500).json({message:e.status?e.message:"Erro ao solicitar conexão."});}});

app.get("/api/conexoes/minhas", autenticar, exigirPerfil("aluno"), async (req, res) => {
  try {
    const result = await db.query(`SELECT 'personal' AS tipo, c.id, c.status, c.ativo, c.criado_em, c.encerrado_em, c.ciclo, u.id AS profissional_id, COALESCE(p.nome, u.nome) AS nome, COALESCE(p.cidade, u.cidade) AS cidade, p.sobre_mim AS descricao, p.foto_perfil AS foto, c.permite_treinos AS permite_principal, c.permite_medidas, c.permite_fotos, c.permite_metas,FALSE AS permite_diario,FALSE AS permite_fotos_refeicoes FROM conexoes_alunos c JOIN usuarios u ON u.id = c.personal_id LEFT JOIN perfis_personal p ON p.usuario_id = u.id WHERE c.aluno_id = $1 UNION ALL SELECT 'nutricionista', c.id, c.status, c.ativo, c.criado_em, c.encerrado_em, c.ciclo, u.id, COALESCE(p.nome, u.nome), COALESCE(p.cidade, u.cidade), p.bio, NULL, c.permite_dietas, c.permite_medidas, c.permite_fotos, c.permite_metas,c.permite_diario,c.permite_fotos_refeicoes FROM conexoes_nutri c JOIN usuarios u ON u.id = c.nutri_id LEFT JOIN perfis_nutri p ON p.usuario_id = u.id WHERE c.aluno_id = $1 ORDER BY criado_em DESC`, [req.usuario.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR CONEXOES:", error.code || 'erro interno');
    return res.status(500).json({ message: "Erro ao buscar conexões." });
  }
});

app.delete("/api/conexoes/:tipo/:id", autenticar, exigirPerfil("aluno"), async(req,res)=>{try{res.json(await encerrarConexao(db,req.usuario.id,req.params.tipo,req.params.id));}catch(e){res.status(e.status||500).json({message:e.status?e.message:"Erro ao encerrar conexão."});}});

// Rotas-isca para varreduras comuns. Não apontam para recursos reais.
const caminhosHoneypot = ["/admin", "/administrator", "/api/admin", "/dashboard", "/debug", "/phpmyadmin", "/wp-admin", "/.env", "/config", "/backup"];
app.all(caminhosHoneypot, (req, res) => {
  const mensagem = "Recurso indisponível.";
  console.warn(`${mensagem} Rota acessada: ${req.path}`);
  if (req.accepts("html")) return res.status(418).type("html").send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Honeypot</title><body style="margin:0;background:#080808;color:#fbbf24;font-family:system-ui;display:grid;place-items:center;min-height:100vh;text-align:center"><main><div style="font-size:5rem">🍯</div><h1>${mensagem}</h1><p style="color:#a3a3a3">Esta rota não leva a lugar nenhum.</p></main></body>`);
  return res.status(418).json({ message: mensagem });
});

if(process.env.SERVE_FRONTEND==='true')app.use(frontend());
app.use((req, res) => res.status(404).json({ message: "Rota não encontrada." }));

// Express identifica middleware de erro pela aridade de quatro argumentos.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ message: "Conteúdo enviado excede o limite permitido." });
  if (error instanceof SyntaxError) return res.status(400).json({ message: "JSON inválido." });
  console.error("ERRO NÃO TRATADO:", error?.code || 'erro interno');
  return res.status(500).json({ message: "Erro interno do servidor." });
});
