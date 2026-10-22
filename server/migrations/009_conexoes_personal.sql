BEGIN;
-- Converte apenas instalações antigas cujo vínculo aponta para perfis_personal.
DO $$
DECLARE restricao RECORD;
BEGIN
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='conexoes_alunos'::regclass AND confrelid='perfis_personal'::regclass) THEN
    FOR restricao IN SELECT conname FROM pg_constraint WHERE conrelid='conexoes_alunos'::regclass AND confrelid='perfis_personal'::regclass LOOP
      EXECUTE format('ALTER TABLE conexoes_alunos DROP CONSTRAINT %I',restricao.conname);
    END LOOP;
    UPDATE conexoes_alunos c SET personal_id=p.usuario_id FROM perfis_personal p WHERE c.personal_id=p.id;
    ALTER TABLE conexoes_alunos ADD CONSTRAINT conexoes_alunos_personal_usuario_fkey FOREIGN KEY(personal_id) REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='conexoes_alunos' AND column_name='tipo_modalidade') THEN
    ALTER TABLE conexoes_alunos ALTER COLUMN tipo_modalidade SET DEFAULT 'Presencial';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS conexoes_alunos_personal_aluno_key ON conexoes_alunos(personal_id,aluno_id);
COMMIT;
