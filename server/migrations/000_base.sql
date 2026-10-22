-- Estrutura anterior à migração 001. Apenas cria tabelas ausentes; não copia dados.
BEGIN;
CREATE TABLE IF NOT EXISTS usuarios (
 id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL,
 senha_hash VARCHAR(255) NOT NULL, tipo_usuario TEXT NOT NULL,
 cidade VARCHAR(100), foto_url TEXT, termo_lgpd_aceito BOOLEAN DEFAULT FALSE,
 tema_preferencia VARCHAR(10) DEFAULT 'dark', cor_accent_neon VARCHAR(20) DEFAULT 'verde',
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS perfis_personal (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
 nome VARCHAR(100) NOT NULL, foto_perfil TEXT, contato VARCHAR(20), whatsapp VARCHAR(20),
 instagram VARCHAR(50), formacao TEXT, sobre_mim TEXT, cidade VARCHAR(100),
 preco_diaria NUMERIC(10,2), preco_semanal NUMERIC(10,2), preco_mensal NUMERIC(10,2), preco_anual NUMERIC(10,2)
);
CREATE TABLE IF NOT EXISTS perfis_academia (
 id SERIAL PRIMARY KEY, usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
 nome VARCHAR(255) NOT NULL, email VARCHAR(255), cnpj VARCHAR(20), telefone VARCHAR(20),
 cidade VARCHAR(100), endereco VARCHAR(255), bio TEXT, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS treinos (
 id SERIAL PRIMARY KEY, usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
 titulo VARCHAR(255) NOT NULL, criado_por VARCHAR(255), origem VARCHAR(50),
 exercicios JSONB, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conexoes_alunos (
 id SERIAL PRIMARY KEY, personal_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 aluno_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 tipo_modalidade VARCHAR(20) NOT NULL DEFAULT 'Presencial', status VARCHAR(20) DEFAULT 'pendente',
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS fotos_academia (
 id SERIAL PRIMARY KEY, academia_id INTEGER REFERENCES perfis_academia(id) ON DELETE CASCADE,
 foto_url TEXT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS fotos_trabalho_personal (
 id SERIAL PRIMARY KEY, personal_id INTEGER NOT NULL REFERENCES perfis_personal(id) ON DELETE CASCADE,
 foto_url TEXT NOT NULL, descricao VARCHAR(255), criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS agenda (
 id SERIAL PRIMARY KEY, personal_id INTEGER NOT NULL REFERENCES perfis_personal(id) ON DELETE CASCADE,
 aluno_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
 data_hora_inicio TIMESTAMP NOT NULL, data_hora_fim TIMESTAMP NOT NULL, status VARCHAR(20) DEFAULT 'disponivel'
);
CREATE TABLE IF NOT EXISTS academias (
 id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
 cnpj VARCHAR(20), telefone VARCHAR(20), cidade VARCHAR(100), endereco VARCHAR(255), bio TEXT, fotos TEXT[]
);
COMMIT;
