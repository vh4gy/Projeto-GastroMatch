USE gastromatch;

-- Execute esta migracao uma unica vez em cada banco existente.
CREATE TABLE IF NOT EXISTS enderecos (
    id_endereco INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    identificacao VARCHAR(50) NOT NULL DEFAULT 'Principal',
    cep CHAR(8) NOT NULL,
    logradouro VARCHAR(150) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    endereco_padrao TINYINT(1) NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enderecos_usuario (id_usuario),
    CONSTRAINT fk_enderecos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

ALTER TABLE pedidos
    ADD COLUMN id_endereco INT NULL,
    ADD COLUMN nome_destinatario VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN observacoes TEXT NULL,
    ADD COLUMN entrega_cep CHAR(8) NOT NULL DEFAULT '',
    ADD COLUMN entrega_logradouro VARCHAR(150) NOT NULL DEFAULT '',
    ADD COLUMN entrega_numero VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN entrega_complemento VARCHAR(100) NULL,
    ADD COLUMN entrega_bairro VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN entrega_cidade VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN entrega_estado CHAR(2) NOT NULL DEFAULT '',
    ADD COLUMN status_entrega ENUM('aguardando_separacao','preparando','enviado','entregue','cancelado') NOT NULL DEFAULT 'aguardando_separacao',
    ADD CONSTRAINT fk_pedidos_endereco FOREIGN KEY (id_endereco) REFERENCES enderecos(id_endereco) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS pagamentos (
    id_pagamento INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    metodo ENUM('pix','cartao','boleto','transferencia') NOT NULL,
    status ENUM('pendente','aprovado','recusado','estornado') NOT NULL DEFAULT 'pendente',
    valor DECIMAL(10,2) NOT NULL,
    moeda CHAR(3) NOT NULL DEFAULT 'BRL',
    provedor VARCHAR(40) NOT NULL DEFAULT 'demonstracao',
    referencia_transacao VARCHAR(80) NULL UNIQUE,
    bandeira_cartao VARCHAR(20) NULL,
    ultimos_quatro CHAR(4) NULL,
    parcelas TINYINT UNSIGNED NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pagamentos_pedido (id_pedido),
    CONSTRAINT fk_pagamentos_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
);

ALTER TABLE itens_pedido
    MODIFY COLUMN id_referencia INT NULL,
    ADD COLUMN id_kit INT NULL,
    ADD COLUMN id_receita INT NULL,
    ADD COLUMN nome_produto VARCHAR(150) NOT NULL DEFAULT '',
    ADD CONSTRAINT fk_itens_pedido_kit FOREIGN KEY (id_kit) REFERENCES kits_ingredientes(id_kit) ON DELETE SET NULL,
    ADD CONSTRAINT fk_itens_pedido_receita FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE SET NULL;

UPDATE itens_pedido ip
JOIN kits_ingredientes k ON k.id_receita = ip.id_referencia
JOIN receitas r ON r.id_receita = k.id_receita
SET ip.id_kit = k.id_kit,
    ip.id_receita = r.id_receita,
    ip.nome_produto = CONCAT('Kit ', r.titulo)
WHERE ip.tipo_item = 'kit_ingredientes' AND ip.id_kit IS NULL;

UPDATE itens_pedido ip
JOIN receitas r ON r.id_receita = ip.id_referencia
SET ip.id_receita = r.id_receita,
    ip.nome_produto = r.titulo
WHERE ip.tipo_item = 'receita' AND ip.id_receita IS NULL;

CREATE INDEX idx_pedidos_cliente_data ON pedidos (id_cliente, data_pedido);
