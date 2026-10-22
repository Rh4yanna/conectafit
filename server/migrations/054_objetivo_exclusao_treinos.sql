BEGIN;
ALTER TABLE treinos ADD COLUMN objetivo text NOT NULL DEFAULT '', ADD COLUMN excluida_em timestamptz;
COMMIT;
