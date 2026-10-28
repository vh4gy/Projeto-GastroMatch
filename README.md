# GastroMatch

Plataforma acadêmica para conectar clientes, chefs e restaurantes em uma experiência gastronômica com receitas, videoaulas, kits de ingredientes e perfis de criadores.

## Visão geral

O GastroMatch simula uma aplicação web completa com:

- autenticação e cadastro de usuários
- perfis de cliente e criador
- receitas com filtros e restrições alimentares
- videoaulas e conteúdo premium
- compra de kits de ingredientes
- fluxo de pagamento em interface local
- integração com banco MySQL via PHP

A proposta principal é aproximar o usuário da experiência profissional da cozinha, com receitas mais completas e orientações mais ricas do que uma busca simples na internet.

## Funcionalidades principais

- Login e cadastro com validação de e-mail
- verificação em duas etapas opcional por e-mail
- CNPJ obrigatório para chef e restaurante
- painel de perfil com edição de dados pessoais
- criação, publicação e listagem de receitas
- filtros por dificuldade, tempo e restrição alimentar
- seleção de receitas gratuitas e exclusivas
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
- login com e-mail e senha
- verificação em duas etapas opcional
- sessão do usuário em sessionStorage

## Requisitos

- XAMPP ou outro ambiente com Apache + MySQL + PHP
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

## Acesso demo

A autenticação demo usa alguns perfis pré-definidos:

- Cliente: `cliente@gastromatch.com.br` — código `GM-CLI-2026`
- Chef: `chef@gastromatch.com.br` — código `GM-CHEF-2026`
- Administrador: `admin@gastromatch.com.br` — código `GM-ADM-2026`

Esses dados servem para testes locais e validação de fluxo. Em produção, os códigos devem ser substituídos por segurança real e autenticação robusta.

## Validações de segurança implementadas

- e-mail com domínio válido
- CNPJ real para chef/restaurante
- validação do tipo de conta
- prevenção de cadastro duplicado
- senha mínima de 6 caracteres
- controle de sessão para o usuário autenticado
- limpeza de carrinho e perfil ao sair da conta

## Observações importantes

- A autenticação real depende de PHP e MySQL funcionando corretamente no servidor.
- O projeto foi validado em JavaScript com checagem final do código sem erros.
- A integração externa de verificação de e-mail pode ser habilitada por variáveis de ambiente em ambiente real, mas o sistema também usa fallback local para manter o projeto funcional.
- O sistema foi desenvolvido como projeto acadêmico e pode ser refinado para produção com autenticação JWT, envio real de e-mails e integração com APIs externas de CNPJ e localização.

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
