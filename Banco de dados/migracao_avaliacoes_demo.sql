USE gastromatch;

CREATE TABLE IF NOT EXISTS avaliacoes_demo (
    id_avaliacao_demo INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    chave_demo VARCHAR(40) NOT NULL,
    nome_demo VARCHAR(80) NOT NULL,
    nota TINYINT UNSIGNED NOT NULL,
    comentario VARCHAR(1000) NOT NULL,
    data_avaliacao DATETIME NOT NULL,
    UNIQUE KEY uk_demo_receita_chave (id_receita, chave_demo),
    KEY idx_demo_receita_data (id_receita, data_avaliacao),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO avaliacoes_demo (id_receita, chave_demo, nome_demo, nota, comentario, data_avaliacao)
VALUES
(1, 'pastel-01', 'Marina (demo)', 5, 'Massa crocante e recheio bem equilibrado.', '2026-02-02 12:00:00'),
(1, 'pastel-02', 'Caio (demo)', 4, 'Gostei bastante; o vinagrete combina muito bem.', '2026-02-05 15:30:00'),
(1, 'pastel-03', 'Lia (demo)', 5, 'Receita simples de acompanhar e muito saborosa.', '2026-02-08 10:15:00'),
(2, 'poutine-01', 'Rafa (demo)', 5, 'Batatas e molho formam uma combinacao otima.', '2026-02-03 14:10:00'),
(2, 'poutine-02', 'Nina (demo)', 4, 'Confortavel e facil de adaptar em casa.', '2026-02-07 17:20:00'),
(2, 'poutine-03', 'Theo (demo)', 4, 'O preparo ficou claro e o resultado bem gostoso.', '2026-02-11 09:40:00'),
(3, 'carbonara-01', 'Bia (demo)', 5, 'O passo a passo ajuda a acertar o molho.', '2026-02-04 11:25:00'),
(3, 'carbonara-02', 'Davi (demo)', 5, 'Ficou cremosa e com otimo sabor.', '2026-02-09 19:00:00'),
(3, 'carbonara-03', 'Noa (demo)', 4, 'Boa receita para fazer durante a semana.', '2026-02-13 13:45:00'),
(4, 'tacos-01', 'Luna (demo)', 5, 'Recheio saboroso e preparo bem direto.', '2026-02-01 16:00:00'),
(4, 'tacos-02', 'Enzo (demo)', 4, 'Ficou otimo com os acompanhamentos sugeridos.', '2026-02-06 12:35:00'),
(4, 'tacos-03', 'Maya (demo)', 5, 'Uma opcao divertida para montar a mesa.', '2026-02-12 18:20:00'),
(5, 'camarao-01', 'Ivo (demo)', 4, 'Empanado crocante e instrucoes faceis de seguir.', '2026-02-03 08:50:00'),
(5, 'camarao-02', 'Sara (demo)', 5, 'O resultado fica dourado e bem sequinho.', '2026-02-10 14:25:00'),
(5, 'camarao-03', 'Yuri (demo)', 4, 'Gostei da textura; vale servir logo depois de fritar.', '2026-02-14 20:10:00')
ON DUPLICATE KEY UPDATE nome_demo = VALUES(nome_demo), nota = VALUES(nota), comentario = VALUES(comentario), data_avaliacao = VALUES(data_avaliacao);

UPDATE receitas r
LEFT JOIN (
    SELECT todas.id_receita, ROUND(AVG(todas.nota), 1) AS media, COUNT(*) AS quantidade
    FROM (
        SELECT id_receita, nota FROM avaliacoes_receitas
        UNION ALL
        SELECT id_receita, nota FROM avaliacoes_demo
    ) todas
    GROUP BY todas.id_receita
) resumo ON resumo.id_receita = r.id_receita
SET r.nota = COALESCE(resumo.media, 0),
    r.avaliacoes = COALESCE(resumo.quantidade, 0);