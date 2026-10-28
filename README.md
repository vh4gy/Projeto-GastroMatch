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
- fluxo de pagamento em interface local
- integração com MySQL via PHP e PDO

A proposta principal é aproximar o usuário da experiência profissional da cozinha, com receitas mais completas e orientações mais ricas do que uma busca simples na internet.

## Funcionalidades principais

- Login com e-mail e senha consultando o banco
- cadastro com validação de e-mail e CNPJ
- verificação em duas etapas opcional
- painel de perfil com dados vindos do banco
- criação e listagem de receitas
- filtros por dificuldade, tempo e restrição alimentar
- compra de kits de ingredientes
- fluxo de checkout e registro de pedidos
- persistência em banco de dados MySQL

## Estrutura do projeto

- [index.html](index.html) — página principal da aplicação
- [login.html](login.html) — página de acesso, login e cadastro
- [api.php](api.php) — API em PHP com integração ao MySQL
- [Banco de dados/banco.sql](Banco%20de%20dados/banco.sql) — estrutura do banco e dados iniciais
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
- receitas
- receitas_restricoes
- videoaulas
- kits_ingredientes
- pedidos
- itens_pedido

Essas tabelas sustentam o cadastro, autenticação, criação de receitas, kits e pedidos.

### 4. Autenticação
O sistema realiza:

- validação de e-mail
- validação de CNPJ para chef/restaurante
- login com e-mail e senha consultando a tabela `usuarios`
- verificação em duas etapas opcional
- sessão do usuário em `sessionStorage`

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

### Passo 3: colocar o projeto na pasta do servidor
Copie a pasta do projeto para:

`C:\xampp\htdocs\GastroMatch`

### Passo 4: acessar as páginas
Abra no navegador:

- http://localhost:8088/GastroMatch/login.html
- http://localhost:8088/GastroMatch/index.html

## Usuários iniciais do banco

Os dados do banco podem ser acessados após a importação do script SQL. O sistema usa autenticação real, então a criação e login são feitos como usuários cadastrados na tabela `usuarios`.

## Validações de segurança implementadas

- e-mail com domínio válido
- CNPJ real para chef/restaurante
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
