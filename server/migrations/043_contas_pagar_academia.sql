BEGIN;
CREATE TABLE contas_pagar_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 descricao TEXT NOT NULL, fornecedor TEXT NOT NULL, categoria TEXT NOT NULL,
 vencimento DATE NOT NULL, valor NUMERIC(12,2) NOT NULL CHECK(valor>0),
 pago NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(pago>=0 AND pago<=valor),
 cancelada BOOLEAN NOT NULL DEFAULT false, versao INTEGER NOT NULL DEFAULT 1,
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 chave_cliente UUID NOT NULL, UNIQUE(academia_id,chave_cliente)
);
ALTER TABLE lancamentos_academia ADD COLUMN conta_pagar_id BIGINT REFERENCES contas_pagar_academia(id);
CREATE INDEX contas_pagar_periodo ON contas_pagar_academia(academia_id,vencimento);
COMMIT;
