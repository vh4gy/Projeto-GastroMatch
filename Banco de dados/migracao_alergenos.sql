USE gastromatch;

CREATE TABLE IF NOT EXISTS receitas_alergenos (
    id_rel INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    alergeno VARCHAR(50) NOT NULL,
    UNIQUE KEY uk_receita_alergeno (id_receita, alergeno),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

DELETE FROM receitas_restricoes
WHERE id_receita = 5 AND restricao = 'sem-lactose';

INSERT IGNORE INTO receitas_alergenos (id_receita, alergeno)
SELECT id_receita, alergeno
FROM (
    SELECT 1 AS id_receita, 'leite' AS alergeno UNION ALL SELECT 1, 'trigo'
    UNION ALL SELECT 2, 'ovos' UNION ALL SELECT 2, 'leite' UNION ALL SELECT 2, 'trigo'
    UNION ALL SELECT 3, 'leite' UNION ALL SELECT 3, 'trigo'
    UNION ALL SELECT 4, 'leite'
    UNION ALL SELECT 5, 'crustaceos' UNION ALL SELECT 5, 'ovos' UNION ALL SELECT 5, 'trigo'
) AS alergeno_demo;
