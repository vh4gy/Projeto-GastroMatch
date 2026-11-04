USE gastromatch;

-- Migração aditiva: cria a relação de alergênicos que a API já consulta.
CREATE TABLE IF NOT EXISTS receitas_alergenos (
    id_rel INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    alergeno VARCHAR(50) NOT NULL,
    UNIQUE KEY uk_receita_alergeno (id_receita, alergeno),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

INSERT IGNORE INTO receitas_alergenos (id_receita, alergeno)
SELECT id_receita, alergeno FROM (
    SELECT 1 AS id_receita, 'leite' AS alergeno UNION ALL SELECT 1, 'trigo'
    UNION ALL SELECT 2, 'ovos' UNION ALL SELECT 2, 'leite' UNION ALL SELECT 2, 'trigo'
    UNION ALL SELECT 3, 'leite' UNION ALL SELECT 3, 'trigo'
    UNION ALL SELECT 4, 'leite'
    UNION ALL SELECT 5, 'crustaceos' UNION ALL SELECT 5, 'ovos' UNION ALL SELECT 5, 'trigo'
) alergeno_demo;

-- O valor fica na própria receita para identificar o restaurante responsável.
ALTER TABLE receitas ADD COLUMN IF NOT EXISTS restaurante_demo VARCHAR(100) NULL;

-- Associação das cinco receitas demonstrativas atuais. Só preenche valores vazios.
UPDATE receitas SET restaurante_demo = CASE id_receita
    WHEN 1 THEN 'Cozinha do Bairro'
    WHEN 2 THEN 'Casa da Massa'
    WHEN 3 THEN 'Bairro Gourmet'
    WHEN 4 THEN 'Sabor do Centro'
    WHEN 5 THEN 'Chef da Rua'
    ELSE restaurante_demo
END
WHERE restaurante_demo IS NULL AND id_receita BETWEEN 1 AND 5;
