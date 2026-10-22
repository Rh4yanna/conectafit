CREATE INDEX IF NOT EXISTS auditoria_matricula_fechamento_idx
ON auditoria_academia(academia_id,registro_id,criado_em DESC,id DESC)
WHERE entidade='matricula';
