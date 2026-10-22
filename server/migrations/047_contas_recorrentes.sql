ALTER TABLE contas_pagar_academia ADD COLUMN grupo_recorrencia uuid;
ALTER TABLE contas_pagar_academia ADD COLUMN ocorrencia integer NOT NULL DEFAULT 1;
ALTER TABLE contas_pagar_academia ADD COLUMN repeticoes integer NOT NULL DEFAULT 1 CHECK(repeticoes BETWEEN 1 AND 36);
CREATE UNIQUE INDEX contas_ocorrencia_unica ON contas_pagar_academia(academia_id,grupo_recorrencia,ocorrencia) WHERE grupo_recorrencia IS NOT NULL;
