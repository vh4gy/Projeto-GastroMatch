USE gastromatch;

CREATE TABLE IF NOT EXISTS avaliacoes_receitas (
    id_avaliacao INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    id_usuario INT NOT NULL,
    nota TINYINT UNSIGNED NOT NULL,
    comentario VARCHAR(1000) NOT NULL DEFAULT '',
    data_avaliacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_avaliacao_receita_usuario (id_receita, id_usuario),
    KEY idx_avaliacao_receita_data (id_receita, data_avaliacao),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE receitas r
SET r.nota = 0, r.avaliacoes = 0
WHERE NOT EXISTS (
    SELECT 1
    FROM avaliacoes_receitas a
    WHERE a.id_receita = r.id_receita
);