# GastroMatch

Plataforma acadêmica para conectar clientes, chefs e restaurantes em uma experiência gastronômica com receitas, videoaulas, kits de ingredientes e perfis de criadores.

## Visão geral

O GastroMatch simula uma aplicação web completa com:

- autenticação real com banco MySQL
- cadastro de usuários
- perfis de cliente, chef e administrador
- receitas com filtros e restrições alimentares
- videoaulas e conteúdo premium
- compra de kits de ingredientes
- avaliação e comentário em cada receita por conta cadastrada, com uma avaliação editável por usuário
- Pix simulado e dinheiro na entrega
- verificação humana de perfis de chef/restaurante
- integração com MySQL via PHP e PDO

A proposta principal é aproximar o usuário da experiência profissional da cozinha, com receitas mais completas e orientações mais ricas do que uma busca simples na internet.

## Funcionalidades principais

- Login com e-mail e senha consultando o banco
- cadastro com validação de e-mail e conferência do formato do CNPJ
- verificação em duas etapas opcional
- painel de perfil com dados vindos do banco
- criação e listagem de receitas
- filtros por dificuldade, tempo e restrição alimentar
- compra de kits de ingredientes
- checkout com endereço, observações, itens e status de entrega
- pagamento Pix demonstrativo com registro no banco, sem gateway financeiro
- controle de estoque dos kits durante a criação do pedido
- persistência em banco de dados MySQL

## Estrutura do projeto

- [index.html](index.html) — página principal da aplicação
- [login.html](login.html) — página de acesso, login e cadastro
- [api.php](api.php) — API em PHP com integração ao MySQL
- [Banco de dados/banco.sql](Banco%20de%20dados/banco.sql) — estrutura do banco e dados iniciais
- [Banco de dados/migracao_compras.sql](Banco%20de%20dados/migracao_compras.sql) — migração incremental do checkout
- [Banco de dados/migracao_imagens_png.sql](Banco%20de%20dados/migracao_imagens_png.sql) — atualização das imagens cadastradas para PNG
- [Banco de dados/migracao_avaliacoes.sql](Banco%20de%20dados/migracao_avaliacoes.sql) — tabela de avaliações por receita e usuário
- [Banco de dados/migracao_pix_verificacao.sql](Banco%20de%20dados/migracao_pix_verificacao.sql) — dados do Pix simulado e fila de verificação profissional
- [Codigo/codigo.js](Codigo/codigo.js) — lógica principal do site
- [Codigo/login.js](Codigo/login.js) — autenticação e cadastro
- [Estilo/estilo.css](Estilo/estilo.css) — estilos gerais
- [Estilo/login.css](Estilo/login.css) — estilos da tela de login
- [AreaRestrita](AreaRestrita) — área técnica para demonstração administrativa

## Como o sistema funciona

### 1. Front-end
A interface é construída em HTML, CSS e JavaScript puro. O navegador monta a experiência do usuário, navega entre receitas, perfil, carrinho e pagamento.

### 2. API
O arquivo [api.php](api.php) atua como camada de comunicação entre o navegador e o banco de dados. Ele recebe requisições em JSON, valida dados e executa operações em MySQL via PDO.

### 3. Banco de dados
O banco contém as tabelas principais:

- usuarios
- perfis_criadores
- verificacoes_criadores
- receitas
- avaliacoes_receitas
- receitas_restricoes
- videoaulas
- kits_ingredientes
- enderecos
- pedidos
- pagamentos
- itens_pedido

Essas tabelas sustentam o cadastro, autenticação, criação de receitas, kits e pedidos.

### 4. Autenticação
O sistema realiza:

- validação de e-mail
- campo de CNPJ para chef/restaurante (14 dígitos; autenticidade fica pendente de integração com API)
- login com e-mail e senha consultando a tabela `usuarios`
- verificação em duas etapas opcional
- sessão autenticada no servidor PHP, com cookie `HttpOnly`; `sessionStorage` mantém apenas o estado visual do navegador

## Requisitos

- XAMPP com Apache + MySQL + PHP
- navegador moderno
- acesso local em localhost

## Como executar

### Passo 1: iniciar o ambiente
Abra o XAMPP e ative:

- Apache
- MySQL

### Passo 2: importar o banco
1. Abra o phpMyAdmin
2. Crie o banco `gastromatch`
3. Importe o arquivo [Banco de dados/banco.sql](Banco%20de%20dados/banco.sql)

Se o banco já existe e contém dados, **não reimporte** o arquivo de instalação. Execute uma vez [Banco de dados/migracao_compras.sql](Banco%20de%20dados/migracao_compras.sql) pelo phpMyAdmin para adicionar os campos e relações do checkout sem apagar os registros existentes.

Para atualizar as imagens das receitas em um banco existente, execute também uma vez [Banco de dados/migracao_imagens_png.sql](Banco%20de%20dados/migracao_imagens_png.sql) pelo phpMyAdmin.

Para habilitar as avaliações em um banco existente, execute uma vez [Banco de dados/migracao_avaliacoes.sql](Banco%20de%20dados/migracao_avaliacoes.sql) pelo phpMyAdmin. A tabela armazena nota e comentário por usuário/receita, impede duplicidade e não altera as receitas ou contas existentes.

Para atualizar pagamentos e criar a fila humana de chefs, execute uma vez [Banco de dados/migracao_pix_verificacao.sql](Banco%20de%20dados/migracao_pix_verificacao.sql) depois da migração do checkout. Ela preserva pagamentos antigos, cria os campos do Pix demonstrativo e a tabela `verificacoes_criadores`, e inicializa o hash da conta administrativa local. Em cada ambiente, use uma senha privada e não compartilhe credenciais.

O arquivo de migração usa comandos `ALTER TABLE` compatíveis com MySQL/MariaDB sem `ADD COLUMN IF NOT EXISTS`, que não está disponível em todas as versões. Execute-o uma única vez em cada cópia existente do banco. Para duas pessoas trabalhando em máquinas diferentes, cada uma aplica a mesma migração ao seu banco local; isso sincroniza o esquema, mas não sincroniza os dados. Compartilhar dados entre máquinas exige configurar um único servidor MySQL acessível a ambas.

### Passo 3: colocar o projeto na pasta do servidor
Copie a pasta do projeto para:

`C:\xampp\htdocs\Projeto-GastroMatch`

### Passo 4: acessar as páginas
Com o Apache na porta padrão 80, abra no navegador:

- http://localhost/Projeto-GastroMatch/login.html
- http://localhost/Projeto-GastroMatch/index.html

Abra as páginas pelo Apache; não abra os arquivos HTML diretamente pelo explorador (`file://`). Se o HTTPS estiver configurado no Apache, use `https://localhost/Projeto-GastroMatch/` (porta padrão 443). As chamadas do navegador à API usam o mesmo host, protocolo e porta da página. A conexão do PHP ao MySQL é independente: por padrão usa `127.0.0.1:3306`.

Para configurar outra instalação do MySQL, defina `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASS` no ambiente do Apache/PHP. Em cada computador, o Apache e o MySQL locais devem estar iniciados e o banco `gastromatch` precisa ser importado nesse MySQL. Os dados locais não são sincronizados automaticamente entre computadores; para compartilhar os mesmos dados, configure um servidor MySQL central e restrinja o acesso à rede necessária. As portas 80 e 443 são do Apache, não devem ser usadas como porta do MySQL.

## Usuários iniciais do banco

Os dados do banco podem ser acessados após a importação do script SQL. O sistema usa autenticação real, então a criação e login são feitos como usuários cadastrados na tabela `usuarios`.

### Códigos de demonstração

Na tela de login, selecione o perfil correspondente e use um dos códigos abaixo. Eles funcionam sem informar e-mail, nome de usuário ou senha:

- Cliente: `GM-CLI-2026`
- Chef / Criador: `GM-CHEF-2026`

O administrador deve entrar com `admin@gastromatch.com.br` e uma senha privada configurada no banco local. Não use códigos públicos para acesso administrativo.

### Verificação de criadores

Chefes e restaurantes informam CNPJ, empresa, relato profissional e um link opcional de evidência. A solicitação permanece pendente até análise humana no painel restrito. O CNPJ não aprova a conta automaticamente, e o servidor bloqueia a publicação de receitas até a equipe aprovar. O parecer pode pedir ajustes e o candidato pode reenviar a solicitação. Para uso fora do ambiente local, configure uma senha administrativa privada e não compartilhe credenciais.

### Pedidos e pagamentos demonstrativos

O checkout salva o endereço do cliente, uma cópia dos dados de entrega no pedido, as observações, os itens com preço e nome registrados no momento da compra, a forma/status do pagamento e o status de entrega. O estoque do kit e o preço são conferidos no servidor e o estoque é atualizado junto com o pedido.

O checkout oferece Pix simulado e dinheiro na entrega. A simulação Pix pede banco, titular e CPF para apresentar o fluxo, mas não se conecta a banco: use dados fictícios. O banco salva somente os quatro últimos dígitos do CPF e não solicita senha, agência ou conta. O link `pix-simulado.html` apenas muda o status demonstrativo do pedido.

## Validações de segurança implementadas

- e-mail com domínio válido
- formato de 14 dígitos do CNPJ para chef/restaurante
- validação do tipo de conta
- prevenção de cadastro duplicado
- senha mínima de 6 caracteres
- controle de sessão para o usuário autenticado
- consulta de perfil diretamente no banco
- uso do MySQL como origem principal dos dados

## Observações importantes

- O sistema foi ajustado para usar o MySQL do XAMPP como fonte principal de autenticação e dados.
- O projeto depende de PHP e MySQL funcionando corretamente no servidor local.
- O README reflete a versão acadêmica do projeto e os fluxos de login e dados em banco real.
- A aplicação pode ser expandida para produção com autenticação JWT, envio real de e-mails e integrações externas.

## Possíveis evoluções futuras

- autenticação JWT
- envio real de e-mail de confirmação
- API de localização por CEP/estado/cidade
- integração com API de validação de CNPJ oficial
- painel administrativo real para aprovação de chefs e restaurantes
- upload real de imagens e arquivos para servidor

## Dicas de manutenção

- não exponha segredos no front-end
- mantenha as regras de negócio no back-end
- faça backup do banco antes de alterações em produção
- sempre valide o banco após importação e testes

## Créditos

Projeto desenvolvido como estudo de aplicação web com banco de dados, autenticação e experiência gastronômica.
