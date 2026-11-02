USE gastromatch;

ALTER TABLE avaliacoes_receitas
    ADD COLUMN IF NOT EXISTS foto_avaliacao VARCHAR(255) NULL AFTER comentario;