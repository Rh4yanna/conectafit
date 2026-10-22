BEGIN;
CREATE TABLE planos_comerciais_personal (
 id bigserial PRIMARY KEY, personal_id bigint NOT NULL REFERENCES usuarios(id),
 nome varchar(120) NOT NULL, valor numeric(12,2) NOT NULL CHECK(valor>0), ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE cobrancas_personal (
 id bigserial PRIMARY KEY, personal_id bigint NOT NULL REFERENCES usuarios(id), aluno_id bigint NOT NULL REFERENCES usuarios(id),
 plano_id bigint REFERENCES planos_comerciais_personal(id), descricao varchar(200) NOT NULL,
 valor numeric(12,2) NOT NULL CHECK(valor>0), vencimento date NOT NULL, pago_em date, cancelada_em timestamptz,
 motivo_cancelamento text, grupo uuid NOT NULL, ocorrencia integer NOT NULL, total_ocorrencias integer NOT NULL,
 criada_em timestamptz NOT NULL DEFAULT now(), UNIQUE(personal_id,grupo,ocorrencia), CHECK(pago_em IS NULL OR cancelada_em IS NULL)
);
CREATE TABLE avisos_personal (
 id bigserial PRIMARY KEY, personal_id bigint NOT NULL REFERENCES usuarios(id), titulo varchar(120) NOT NULL,
 mensagem text NOT NULL, destinatarios jsonb NOT NULL, enviada_em timestamptz, excluida_em timestamptz,
 versao integer NOT NULL DEFAULT 1, chave_cliente uuid NOT NULL, UNIQUE(personal_id,chave_cliente)
);
ALTER TABLE notificacoes ADD COLUMN conteudo text;
ALTER TABLE medidas_aluno ADD COLUMN autor_personal_id bigint REFERENCES usuarios(id),
 ADD COLUMN massa_muscular numeric(6,2), ADD COLUMN metodo text, ADD COLUMN chave_cliente uuid;
CREATE UNIQUE INDEX medida_personal_chave ON medidas_aluno(autor_personal_id,chave_cliente);
ALTER TABLE fotos_evolucao ADD COLUMN autor_personal_id bigint REFERENCES usuarios(id), ADD COLUMN consentimento_em timestamptz;
COMMIT;
