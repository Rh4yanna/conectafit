ALTER TABLE agenda_academia ADD COLUMN responsavel_id bigint REFERENCES usuarios(id);
CREATE INDEX agenda_responsavel_vinculado ON agenda_academia(academia_id,responsavel_id,inicio);
