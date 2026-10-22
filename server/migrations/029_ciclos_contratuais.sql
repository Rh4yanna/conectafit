BEGIN;
CREATE TABLE ciclos_matricula (
 id BIGSERIAL PRIMARY KEY, matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 inicio DATE NOT NULL, termino DATE NOT NULL, contrato JSONB NOT NULL, dia_vencimento SMALLINT NOT NULL CHECK(dia_vencimento BETWEEN 1 AND 28),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(termino>=inicio)
);
CREATE INDEX ciclos_matricula_idx ON ciclos_matricula(matricula_id,inicio,termino);
INSERT INTO ciclos_matricula(matricula_id,inicio,termino,contrato,dia_vencimento,autor_id)
 SELECT id,inicio,termino,contrato,dia_vencimento,academia_id FROM matriculas_academia WHERE inicio IS NOT NULL AND termino IS NOT NULL AND contrato IS NOT NULL;
COMMIT;
