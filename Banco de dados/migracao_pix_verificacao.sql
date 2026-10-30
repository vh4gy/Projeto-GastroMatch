USE gastromatch;

ALTER TABLE pagamentos
    MODIFY COLUMN metodo ENUM('pix','dinheiro','cartao','boleto','transferencia') NOT NULL,
    ADD COLUMN banco_pagador VARCHAR(80) NULL,
    ADD COLUMN titular_pagador VARCHAR(100) NULL,
    ADD COLUMN cpf_final4 CHAR(4) NULL,
    ADD COLUMN link_pagamento VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS verificacoes_criadores (
    id_verificacao INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    empresa VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    relato_profissional TEXT NOT NULL,
    link_evidencia VARCHAR(500) NULL,
    status ENUM('pendente','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
    parecer_revisor VARCHAR(1000) NULL,
    revisado_por INT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    analisado_em DATETIME NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (revisado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_verificacoes_status_data (status, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE usuarios
SET senha_hash = '$2y$12$S/ctHWTulZ0hAaxv3O74P.WvhYDQZosHtr3n.xVKfCR8lQ6fC.bgK'
WHERE id_usuario = 1
    AND email = 'admin@gastromatch.com.br'
    AND tipo_usuario = 'admin';