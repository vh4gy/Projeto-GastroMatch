USE gastromatch;

CREATE TABLE IF NOT EXISTS compras_receitas (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_receita INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
    metodo VARCHAR(20) NOT NULL DEFAULT 'pix_demo',
    banco VARCHAR(40) NULL,
    titular VARCHAR(100) NULL,
    cpf_final4 CHAR(4) NULL,
    comprado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_compra_usuario_receita (id_usuario, id_receita),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);
