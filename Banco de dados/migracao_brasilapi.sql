USE gastromatch;

-- Execute uma única vez, depois de migracao_pix_verificacao.sql.
-- Os dados de consulta externa ficam separados da aprovação humana do perfil.
ALTER TABLE verificacoes_criadores
    ADD COLUMN cnpj_status_consulta ENUM('ativo','inativo','nao_encontrado','indisponivel','demo','nao_consultado') NOT NULL DEFAULT 'nao_consultado',
    ADD COLUMN cnpj_razao_social VARCHAR(180) NULL,
    ADD COLUMN cnpj_nome_fantasia VARCHAR(180) NULL,
    ADD COLUMN cnpj_consultado_em DATETIME NULL;

-- Conta administrativa local: senha temporária individual para recuperar o acesso.
-- Troque-a depois da apresentação e não reutilize em outros serviços.
UPDATE usuarios
SET senha_hash = '$2y$12$UlLXvt2rsajtUeaUxyDMfOp8wZQFPhOH3nRsDMEhiODoCOAStUxBm'
WHERE email = 'admin@gastromatch.com.br' AND tipo_usuario = 'admin';

-- Conta fictícia pendente para demonstrar a análise humana de um criador.
-- O CNPJ 00.000.000/0000-00 é propositalmente inválido e NUNCA representa empresa real.
INSERT INTO usuarios (nome, email, senha_hash, codigo_acesso, tipo_usuario, telefone, foto_perfil, data_cadastro,
    email_verificado, verificacao_2fa, cnpj, cnpj_validado, ativo)
SELECT 'Chef Demonstração (Pendente)', 'chef.teste@gastromatch.com.br',
    '$2y$10$3sT8e2O8iNmhA4A5n2Hk2uY0m9m7k5j3p2M5EwHh4A9wP1q7vUjO',
    'GM-CHEF-TESTE-2026', 'chef', '', '', CURRENT_DATE, 1, 0, '00000000000000', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'chef.teste@gastromatch.com.br');

INSERT INTO perfis_criadores (id_usuario, biografia, link_portfolio, status_validacao)
SELECT id_usuario, 'Perfil fictício para demonstrar a fila de análise administrativa.', '', 'pendente'
FROM usuarios WHERE email = 'chef.teste@gastromatch.com.br'
ON DUPLICATE KEY UPDATE status_validacao = 'pendente';

INSERT INTO verificacoes_criadores (id_usuario, empresa, cnpj, relato_profissional, link_evidencia,
    status, cnpj_status_consulta, cnpj_razao_social, cnpj_nome_fantasia)
SELECT id_usuario, 'Restaurante Fictício GastroMatch', '00000000000000',
    'Conta de demonstração acadêmica criada para testar a análise humana de perfis profissionais no painel administrativo.',
    NULL, 'pendente', 'demo', 'DADO FICTÍCIO - NÃO EXISTE NA RECEITA FEDERAL', 'CADASTRO DE TESTE'
FROM usuarios WHERE email = 'chef.teste@gastromatch.com.br'
ON DUPLICATE KEY UPDATE
    status = 'pendente', cnpj_status_consulta = 'demo',
    cnpj_razao_social = 'DADO FICTÍCIO - NÃO EXISTE NA RECEITA FEDERAL',
    cnpj_nome_fantasia = 'CADASTRO DE TESTE';

UPDATE usuarios SET cnpj_validado = 0 WHERE email = 'chef.teste@gastromatch.com.br';
