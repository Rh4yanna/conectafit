BEGIN;
CREATE TABLE planos_comerciais (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), nome VARCHAR(80) NOT NULL,
 valor NUMERIC(10,2) NOT NULL CHECK(valor>=0), duracao_meses INT NOT NULL CHECK(duracao_meses BETWEEN 1 AND 36),
 servicos TEXT NOT NULL, modalidades TEXT NOT NULL, condicoes TEXT NOT NULL, ativo BOOLEAN NOT NULL DEFAULT true,
 versao INT NOT NULL DEFAULT 1
);
ALTER TABLE matriculas_academia ADD COLUMN situacao TEXT NOT NULL DEFAULT 'ativa' CHECK(situacao IN ('ativa','trancada','cancelada','inativa'));
UPDATE matriculas_academia SET situacao='inativa' WHERE NOT ativo;
ALTER TABLE matriculas_academia ADD COLUMN inicio DATE;
ALTER TABLE matriculas_academia ADD COLUMN termino DATE;
ALTER TABLE matriculas_academia ADD COLUMN contrato JSONB;
ALTER TABLE matriculas_academia ADD COLUMN versao INT NOT NULL DEFAULT 1;
ALTER TABLE matriculas_academia ADD CONSTRAINT vigencia_valida CHECK(termino IS NULL OR inicio IS NOT NULL AND termino>=inicio);
CREATE TABLE equipe_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
 papel TEXT NOT NULL CHECK(papel IN ('gestor','recepcao','professor')), ativo BOOLEAN NOT NULL DEFAULT true,
 UNIQUE(academia_id,usuario_id)
);
CREATE TABLE auditoria_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 entidade TEXT NOT NULL, registro_id BIGINT NOT NULL, acao TEXT NOT NULL, motivo TEXT NOT NULL,
 antes JSONB, depois JSONB, criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_academia_idx ON auditoria_academia(academia_id,entidade,registro_id,id);
ALTER TABLE lancamentos_academia DROP CONSTRAINT IF EXISTS lancamentos_academia_mensalidade_id_key;
ALTER TABLE lancamentos_academia ADD COLUMN categoria TEXT NOT NULL DEFAULT 'outros';
ALTER TABLE lancamentos_academia ADD COLUMN autor_id BIGINT REFERENCES usuarios(id);
ALTER TABLE lancamentos_academia ADD COLUMN chave_cliente UUID;
ALTER TABLE lancamentos_academia ADD COLUMN estorno_de BIGINT UNIQUE REFERENCES lancamentos_academia(id);
CREATE UNIQUE INDEX lancamentos_chave_idx ON lancamentos_academia(academia_id,chave_cliente);
ALTER TABLE mensalidades_academia ADD COLUMN recebido NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE mensalidades_academia ADD COLUMN desconto NUMERIC(10,2) NOT NULL DEFAULT 0;
UPDATE mensalidades_academia SET recebido=valor WHERE pago_em IS NOT NULL;
ALTER TABLE mensalidades_academia ADD CONSTRAINT saldo_mensalidade CHECK(recebido>=0 AND desconto>=0 AND recebido+desconto<=valor);
CREATE TABLE presencas_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 data DATE NOT NULL, autor_id BIGINT NOT NULL REFERENCES usuarios(id), cancelada BOOLEAN NOT NULL DEFAULT false,
 UNIQUE(matricula_id,data)
);
CREATE TABLE contatos_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), motivo TEXT NOT NULL, relato TEXT NOT NULL, proximo_contato DATE,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE turmas_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), nome TEXT NOT NULL, inicio TIMESTAMPTZ NOT NULL,
 fim TIMESTAMPTZ NOT NULL, vagas INT NOT NULL CHECK(vagas BETWEEN 1 AND 500), local TEXT NOT NULL, professor TEXT NOT NULL,
 cancelada BOOLEAN NOT NULL DEFAULT false, CHECK(fim>inicio)
);
CREATE TABLE reservas_academia (
 id BIGSERIAL PRIMARY KEY, turma_id BIGINT NOT NULL REFERENCES turmas_academia(id), matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 cancelada BOOLEAN NOT NULL DEFAULT false, UNIQUE(turma_id,matricula_id)
);
CREATE TABLE convites_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), token_hash TEXT NOT NULL UNIQUE,
 expira_em TIMESTAMPTZ NOT NULL DEFAULT now()+interval '7 days', revogado BOOLEAN NOT NULL DEFAULT false,
 usado_por BIGINT REFERENCES usuarios(id), matricula_id BIGINT REFERENCES matriculas_academia(id)
);
CREATE TABLE importacoes_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 registros JSONB NOT NULL, expira_em TIMESTAMPTZ NOT NULL DEFAULT now()+interval '24 hours', resultado JSONB
);
CREATE TABLE estrutura_academia (
 academia_id BIGINT PRIMARY KEY REFERENCES usuarios(id), equipamentos TEXT NOT NULL DEFAULT '', acessibilidade TEXT NOT NULL DEFAULT '',
 ambientes TEXT NOT NULL DEFAULT '', horarios TEXT NOT NULL DEFAULT ''
);
COMMIT;
