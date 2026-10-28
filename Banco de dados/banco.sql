CREATE DATABASE IF NOT EXISTS gastromatch;
USE gastromatch;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    codigo_acesso VARCHAR(40) NOT NULL,
    tipo_usuario ENUM('cliente','chef','restaurante','admin') NOT NULL,
    telefone VARCHAR(20) DEFAULT '',
    foto_perfil TEXT NULL,
    data_cadastro DATE NOT NULL DEFAULT (CURRENT_DATE),
    email_verificado TINYINT(1) NOT NULL DEFAULT 0,
    email_verificacao_codigo VARCHAR(12) NULL,
    email_verificado_em DATETIME NULL,
    verificacao_2fa TINYINT(1) NOT NULL DEFAULT 1,
    cnpj VARCHAR(18) NULL UNIQUE,
    cnpj_validado TINYINT(1) NOT NULL DEFAULT 0,
    cnpj_validado_em DATETIME NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS perfis_criadores (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    biografia TEXT NULL,
    link_portfolio VARCHAR(255) NULL,
    status_validacao ENUM('pendente','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receitas (
    id_receita INT AUTO_INCREMENT PRIMARY KEY,
    id_criador INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao_introducao TEXT NOT NULL,
    rendimento INT NOT NULL DEFAULT 1,
    tempo_preparo_minutos INT NOT NULL DEFAULT 0,
    nivel_dificuldade ENUM('facil','medio','dificil') NOT NULL DEFAULT 'facil',
    tipo_acesso ENUM('gratuito','exclusivo_pago') NOT NULL DEFAULT 'gratuito',
    preco_conteudo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    img VARCHAR(255) NOT NULL DEFAULT 'img/pastel.jpg',
    pais CHAR(2) NULL,
    nota DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    avaliacoes INT NOT NULL DEFAULT 0,
    criado_pelo_chef TINYINT(1) NOT NULL DEFAULT 1,
    data_publicacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_criador) REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS receitas_restricoes (
    id_rel INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    restricao VARCHAR(50) NOT NULL,
    UNIQUE KEY uk_receita_restricao (id_receita, restricao),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS videoaulas (
    id_video INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    url_video VARCHAR(255) NULL,
    duracao_segundos INT NOT NULL DEFAULT 0,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kits_ingredientes (
    id_kit INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    preco_kit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estoque_disponivel INT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_receita_kit (id_receita),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ingredientes_receita (
    id_ingrediente INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    ordem INT NOT NULL,
    ingrediente VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preparo_receita (
    id_passo INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    ordem INT NOT NULL,
    passo TEXT NOT NULL,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    data_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_pedido ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    tipo_item ENUM('kit_ingredientes','receita') NOT NULL DEFAULT 'kit_ingredientes',
    id_referencia INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
);

INSERT INTO usuarios (id_usuario, nome, email, senha_hash, codigo_acesso, tipo_usuario, telefone, foto_perfil, data_cadastro)
VALUES
(1, 'Administrador GastroMatch', 'admin@gastromatch.com.br', '$2y$10$3sT8e2O8iNmhA4A5n2Hk2uY0m9m7k5j3p2M5EwHh4A9wP1q7vUjO', 'GM-ADM-2026', 'admin', '(11) 3000-0001', '', '2026-01-01'),
(2, 'Chef GastroMatch', 'chef@gastromatch.com.br', '$2y$10$3sT8e2O8iNmhA4A5n2Hk2uY0m9m7k5j3p2M5EwHh4A9wP1q7vUjO', 'GM-CHEF-2026', 'chef', '(11) 98888-0002', '', '2026-01-02'),
(10, 'Cliente GastroMatch', 'cliente@gastromatch.com.br', '$2y$10$3sT8e2O8iNmhA4A5n2Hk2uY0m9m7k5j3p2M5EwHh4A9wP1q7vUjO', 'GM-CLI-2026', 'cliente', '(11) 97777-0003', '', '2026-01-03')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), email = VALUES(email), codigo_acesso = VALUES(codigo_acesso), tipo_usuario = VALUES(tipo_usuario);

INSERT INTO perfis_criadores (id_usuario, biografia, link_portfolio, status_validacao)
VALUES
(2, 'Chef apaixonado por transformar receitas em experiências simples e saborosas.', 'https://gastromatch.com.br', 'aprovado')
ON DUPLICATE KEY UPDATE biografia = VALUES(biografia), link_portfolio = VALUES(link_portfolio), status_validacao = VALUES(status_validacao);

INSERT INTO receitas (id_receita, id_criador, titulo, descricao_introducao, rendimento, tempo_preparo_minutos, nivel_dificuldade, tipo_acesso, preco_conteudo, img, pais, nota, avaliacoes, criado_pelo_chef, data_publicacao)
VALUES
(1, 2, 'Pastel de Queijo com Molho Vinagrete', 'Pastel crocante recheado com queijo e servido com vinagrete.', 8, 45, 'medio', 'gratuito', 0.00, 'img/pastel.jpg', 'br', 4.9, 85, 1, '2026-01-05 12:00:00'),
(2, 2, 'Poutine', 'Batatas crocantes, queijo e molho gravy em um clássico reconfortante.', 4, 20, 'facil', 'gratuito', 0.00, 'img/poutine.jpg', 'ca', 4.0, 67, 1, '2026-01-06 12:00:00'),
(3, 2, 'Carbonara', 'Massa cremosa finalizada com gemas, queijo, pimenta e guanciale.', 2, 20, 'facil', 'gratuito', 0.00, 'img/carbonara.jpg', 'it', 4.0, 99, 1, '2026-01-07 12:00:00'),
(4, 2, 'Tacos', 'Tacos crocantes com carne temperada, vegetais e queijo.', 4, 25, 'facil', 'gratuito', 0.00, 'img/tacos.jpg', 'mx', 4.7, 52, 1, '2026-01-08 12:00:00'),
(5, 2, 'Camarão Empanado', 'Camarões dourados e crocantes, empanados com farinha panko.', 4, 30, 'medio', 'gratuito', 0.00, 'img/camarao.jpg', '', 4.5, 38, 1, '2026-01-09 12:00:00')
ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), descricao_introducao = VALUES(descricao_introducao), rendimento = VALUES(rendimento), tempo_preparo_minutos = VALUES(tempo_preparo_minutos), nivel_dificuldade = VALUES(nivel_dificuldade), tipo_acesso = VALUES(tipo_acesso), preco_conteudo = VALUES(preco_conteudo), img = VALUES(img), pais = VALUES(pais), nota = VALUES(nota), avaliacoes = VALUES(avaliacoes);

INSERT INTO receitas_restricoes (id_receita, restricao)
VALUES
(2, 'vegano'),
(3, 'sem-gluten'),
(5, 'sem-lactose')
ON DUPLICATE KEY UPDATE restricao = VALUES(restricao);

INSERT INTO videoaulas (id_receita, url_video, duracao_segundos)
VALUES
(1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 320),
(2, 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 260)
ON DUPLICATE KEY UPDATE url_video = VALUES(url_video), duracao_segundos = VALUES(duracao_segundos);

INSERT INTO kits_ingredientes (id_receita, preco_kit, estoque_disponivel)
VALUES
(1, 14.89, 20),
(2, 25.99, 20),
(3, 11.99, 20),
(4, 19.90, 20),
(5, 32.90, 20)
ON DUPLICATE KEY UPDATE preco_kit = VALUES(preco_kit), estoque_disponivel = VALUES(estoque_disponivel);

INSERT INTO ingredientes_receita (id_receita, ordem, ingrediente)
VALUES
(1, 1, '500g de Massa para Pastel (fresca)'),
(1, 2, '300g de Queijo Minas Padrão ralado'),
(1, 3, '100g de Queijo Muçarela ralado'),
(1, 4, 'Óleo de milho ou girassol para fritar'),
(2, 1, '1kg de batatas'),
(2, 2, 'Óleo para fritar'),
(2, 3, '300g de queijo coalho em cubos'),
(2, 4, 'Molho (gravy)'),
(3, 1, '400g de Espaguete (fresco ou seco)'),
(3, 2, '150g de Guanciale (ou Pancetta) em cubos'),
(3, 3, '4 Ovos grandes (gemas separadas)'),
(3, 4, '100g de Queijo Pecorino Romano ralado'),
(3, 5, 'Pimenta-preta moída na hora'),
(4, 1, '8 conchas de taco'),
(4, 2, '400g de carne moída'),
(4, 3, '1 sachê de tempero para tacos'),
(4, 4, 'Alface e tomate picados'),
(4, 5, '100g de queijo cheddar ralado'),
(5, 1, '500g de camarão limpo'),
(5, 2, '2 ovos batidos'),
(5, 3, '1 xícara de farinha de trigo'),
(5, 4, '2 xícaras de farinha panko'),
(5, 5, 'Sal, pimenta e óleo para fritar')
ON DUPLICATE KEY UPDATE ingrediente = VALUES(ingrediente);

INSERT INTO preparo_receita (id_receita, ordem, passo)
VALUES
(1, 1, 'Prepare o vinagrete misturando tomate, cebola e temperos.'),
(1, 2, 'Recheie os pastéis com o queijo minas e muçarela e feche as bordas.'),
(1, 3, 'Frite em óleo bem quente até dourar.'),
(1, 4, 'Sirva com o vinagrete.'),
(2, 1, 'Prepare as batatas: corte em palitos e deixe de molho em água por alguns minutos. Depois, seque bem.'),
(2, 2, 'Frite as batatas em óleo quente até ficarem douradas e crocantes. Retire e coloque sobre papel-toalha.'),
(2, 3, 'Aqueça o molho gravy até ficar bem quente.'),
(2, 4, 'Monte: coloque as batatas em um prato, espalhe os pedaços de queijo por cima e despeje o molho quente.'),
(2, 5, 'Sirva imediatamente: o calor do molho ajuda a deixar o queijo macio, enquanto as batatas continuam crocantes.'),
(3, 1, 'Cozinhe o espaguete em água com pouco sal até a textura desejada.'),
(3, 2, 'Em uma tigela, bata as gemas com o queijo ralado e a pimenta.'),
(3, 3, 'Frite o guanciale em sua própria gordura até ficar crocante. Reserve a gordura.'),
(3, 4, 'Transfira a massa escorrida para a panela do guanciale e desligue o fogo.'),
(3, 5, 'Adicione a mistura de ovos e queijo, misturando rapidamente para formar um creme com o calor residual. Adicione água da massa se necessário.'),
(4, 1, 'Refogue a carne moída com o tempero até secar.'),
(4, 2, 'Aqueça as conchas no forno por 3 minutos.'),
(4, 3, 'Recheie com a carne, a alface, o tomate e o queijo.'),
(4, 4, 'Sirva na hora.'),
(5, 1, 'Tempere os camarões com sal e pimenta.'),
(5, 2, 'Passe na farinha de trigo, nos ovos e na farinha panko.'),
(5, 3, 'Frite em óleo quente até dourar.'),
(5, 4, 'Escorra em papel-toalha e sirva.')
ON DUPLICATE KEY UPDATE passo = VALUES(passo);
