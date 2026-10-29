<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbName = getenv('DB_NAME') ?: 'gastromatch';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';

function jsonReply(bool $success, string $message = '', $data = null, int $status = 200): void
{
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ]);
    exit;
}

function emailLooksValid(string $email): bool
{
    $email = trim(strtolower($email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $parts = explode('@', $email);
    if (count($parts) !== 2) {
        return false;
    }

    [$local, $domain] = $parts;
    if ($local === '' || $domain === '' || substr_count($domain, '.') === 0) {
        return false;
    }

    return preg_match('/^[a-z0-9._%+\-]+$/', $local) === 1 && preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/i', $domain) === 1;
}

function cnpjHasValidFormat(string $cnpj): bool
{
    $cnpj = preg_replace('/\D+/', '', $cnpj);
    return strlen($cnpj) === 14;
}

function externalEmailCheck(string $email): array
{
    $apiUrl = getenv('EMAIL_VERIFY_API_URL') ?: '';
    $apiKey = getenv('EMAIL_VERIFY_API_KEY') ?: '';

    if ($apiUrl === '') {
        return ['valid' => emailLooksValid($email), 'source' => 'local', 'message' => 'Validação local aplicada. Para checar domínio real em produção, configure EMAIL_VERIFY_API_URL e EMAIL_VERIFY_API_KEY.'];
    }

    $payload = json_encode(['email' => $email]);
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$apiKey}\r\nAccept: application/json",
            'content' => $payload,
            'timeout' => 10,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);

    $response = @file_get_contents($apiUrl, false, $context);
    if ($response === false) {
        return ['valid' => emailLooksValid($email), 'source' => 'fallback', 'message' => 'API externa indisponível; validação local usada como fallback.'];
    }

    $json = json_decode($response, true);
    if (!is_array($json)) {
        return ['valid' => emailLooksValid($email), 'source' => 'fallback', 'message' => 'Resposta inválida da API externa; validação local usada.'];
    }

    return ['valid' => (bool)($json['valid'] ?? false), 'source' => 'external', 'message' => (string)($json['message'] ?? 'Email verificado pela API externa.')];
}

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    jsonReply(false, 'MySQL indisponível: ' . $e->getMessage(), null, 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? 'status');

if ($action === 'status') {
    jsonReply(true, 'API do GastroMatch conectada ao MySQL.', ['database' => $dbName]);
}

if ($action === 'register') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $nome = trim((string)($input['nome'] ?? ''));
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $senha = (string)($input['password'] ?? '');
    $tipo = strtolower(trim((string)($input['tipo_usuario'] ?? 'cliente')));
    $cnpj = preg_replace('/\D+/', '', (string)($input['cnpj'] ?? ''));
    $verificacao2fa = (int)($input['verificacao_2fa'] ?? 1);
    $verificacao2fa = in_array($verificacao2fa, [0, 1], true) ? $verificacao2fa : 1;

    if (!in_array($tipo, ['cliente', 'chef', 'restaurante'], true)) {
        $tipo = 'cliente';
    }

    if ($nome === '' || $email === '' || strlen($senha) < 6 || !emailLooksValid($email)) {
        jsonReply(false, 'Informe nome, e-mail válido e senha com pelo menos 6 caracteres.', null, 400);
    }

    $emailValidation = externalEmailCheck($email);
    if (!$emailValidation['valid']) {
        jsonReply(false, 'E-mail inválido ou não aceito pela validação de domínio.', null, 400);
    }

    if (in_array($tipo, ['chef', 'restaurante'], true) && $cnpj === '') {
        jsonReply(false, 'Chef e restaurante devem informar um CNPJ com 14 dígitos.', null, 400);
    }

    if (in_array($tipo, ['chef', 'restaurante'], true) && !cnpjHasValidFormat($cnpj)) {
        jsonReply(false, 'Informe um CNPJ com 14 dígitos.', null, 400);
    }

    $check = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE email = :email LIMIT 1');
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        jsonReply(false, 'Este e-mail já está cadastrado.', null, 409);
    }

    $codigo = strtoupper($tipo === 'cliente' ? 'GM-CLI-' : ($tipo === 'chef' ? 'GM-CHEF-' : 'GM-REST-')) . str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
    $hash = password_hash($senha, PASSWORD_DEFAULT);
    $emailVerificado = $verificacao2fa === 0 ? 1 : 0;
    $codigoVerificacao = $verificacao2fa === 1 ? str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT) : null;

    $insert = $pdo->prepare('INSERT INTO usuarios (nome, email, senha_hash, codigo_acesso, tipo_usuario, telefone, foto_perfil, data_cadastro, email_verificado, email_verificacao_codigo, verificacao_2fa, cnpj, cnpj_validado, ativo)
        VALUES (:nome, :email, :senha_hash, :codigo_acesso, :tipo_usuario, :telefone, :foto_perfil, NOW(), :email_verificado, :email_verificacao_codigo, :verificacao_2fa, :cnpj, :cnpj_validado, :ativo)');
    $insert->execute([
        ':nome' => $nome,
        ':email' => $email,
        ':senha_hash' => $hash,
        ':codigo_acesso' => $codigo,
        ':tipo_usuario' => $tipo,
        ':telefone' => '',
        ':foto_perfil' => '',
        ':email_verificado' => $emailVerificado,
        ':email_verificacao_codigo' => $codigoVerificacao,
        ':verificacao_2fa' => $verificacao2fa,
        ':cnpj' => in_array($tipo, ['chef', 'restaurante'], true) ? $cnpj : null,
        ':cnpj_validado' => 0,
        ':ativo' => 1,
    ]);

    $idUsuario = (int)$pdo->lastInsertId();

    if (in_array($tipo, ['chef', 'restaurante'], true)) {
        $pdo->prepare('INSERT INTO perfis_criadores (id_usuario, biografia, link_portfolio, status_validacao)
            VALUES (:id_usuario, :biografia, :link_portfolio, :status_validacao)')
            ->execute([
                ':id_usuario' => $idUsuario,
                ':biografia' => 'Perfil em análise na plataforma.',
                ':link_portfolio' => '',
                ':status_validacao' => 'pendente',
            ]);
    }

    $responseData = ['user' => [
        'id_usuario' => $idUsuario,
        'nome' => $nome,
        'email' => $email,
        'tipo_usuario' => $tipo,
        'codigo_acesso' => $codigo,
        'email_verificado' => $emailVerificado,
        'verificacao_2fa' => $verificacao2fa,
        'cnpj' => in_array($tipo, ['chef', 'restaurante'], true) ? $cnpj : null,
    ]];

    if ($verificacao2fa === 1) {
        $responseData['verification_code'] = $codigoVerificacao;
        $responseData['verification_required'] = true;
    }

    jsonReply(true, 'Conta criada com sucesso.', $responseData);
}

if ($action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $senha = (string)($input['password'] ?? '');
    $codigoVerificacao = trim((string)($input['codigo_verificacao'] ?? ''));

    if ($email !== '' && $senha !== '') {
        $user = $pdo->prepare('SELECT * FROM usuarios WHERE email = :email LIMIT 1');
        $user->execute([':email' => $email]);
        $usuario = $user->fetch();

        if (!$usuario || !password_verify($senha, $usuario['senha_hash'])) {
            jsonReply(false, 'E-mail ou senha inválidos.', null, 401);
        }

        if ((int)$usuario['verificacao_2fa'] === 1 && (int)$usuario['email_verificado'] === 0) {
            $codigoBanco = (string)($usuario['email_verificacao_codigo'] ?? '');
            if ($codigoBanco !== '' && $codigoVerificacao === '') {
                jsonReply(false, 'Verificação em duas etapas pendente. Informe o código enviado ao e-mail.', null, 401);
            }
            if ($codigoBanco !== '' && $codigoVerificacao !== $codigoBanco) {
                jsonReply(false, 'Código de verificação incorreto.', null, 401);
            }
            if ($codigoBanco !== '' && $codigoVerificacao === $codigoBanco) {
                $pdo->prepare('UPDATE usuarios SET email_verificado = 1, email_verificado_em = NOW(), email_verificacao_codigo = NULL WHERE id_usuario = :id')
                    ->execute([':id' => $usuario['id_usuario']]);
                $usuario['email_verificado'] = 1;
                $usuario['email_verificacao_codigo'] = null;
            }
        }

        unset($usuario['senha_hash']);
        jsonReply(true, 'Login realizado com sucesso.', ['user' => $usuario]);
    }

    $role = strtolower((string)($input['role'] ?? ''));
    $code = strtoupper(trim((string)($input['code'] ?? '')));

    if ($role === '' || $code === '') {
        jsonReply(false, 'Perfil e código são obrigatórios.', null, 400);
    }

    $user = $pdo->prepare('SELECT u.*, p.biografia, p.link_portfolio, p.status_validacao
        FROM usuarios u
        LEFT JOIN perfis_criadores p ON p.id_usuario = u.id_usuario
        WHERE u.tipo_usuario = :tipo AND u.codigo_acesso = :codigo
        LIMIT 1');
    $user->execute([':tipo' => $role, ':codigo' => $code]);
    $usuario = $user->fetch();

    if (!$usuario) {
        jsonReply(false, 'Código inválido para o perfil selecionado.', null, 401);
    }

    $usuario['tipo_usuario'] = $usuario['tipo_usuario'] ?? $role;
    unset($usuario['senha_hash']);

    jsonReply(true, 'Login realizado com sucesso.', ['user' => $usuario]);
}

if ($action === 'perfil') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $idUsuario = (int)($input['id_usuario'] ?? $_GET['id_usuario'] ?? 0);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!$idUsuario) {
            jsonReply(false, 'Identificador do usuário obrigatório.', null, 400);
        }

        $stmt = $pdo->prepare('SELECT u.*, p.biografia, p.link_portfolio, p.status_validacao
            FROM usuarios u
            LEFT JOIN perfis_criadores p ON p.id_usuario = u.id_usuario
            WHERE u.id_usuario = :id');
        $stmt->execute([':id' => $idUsuario]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            jsonReply(false, 'Usuário não encontrado.', null, 404);
        }

        unset($usuario['senha_hash']);
        jsonReply(true, 'Perfil carregado.', ['user' => $usuario]);
    }

    $nome = trim((string)($input['nome'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $telefone = trim((string)($input['telefone'] ?? ''));
    $biografia = trim((string)($input['biografia'] ?? ''));
    $linkPortfolio = trim((string)($input['link_portfolio'] ?? ''));
    $statusValidacao = trim((string)($input['status_validacao'] ?? 'pendente'));

    if (!$idUsuario || $nome === '' || $email === '') {
        jsonReply(false, 'Dados do perfil incompletos.', null, 400);
    }

    try {
        $pdo->beginTransaction();

        $pdo->prepare('UPDATE usuarios SET nome = :nome, email = :email, telefone = :telefone WHERE id_usuario = :id')
            ->execute([':nome' => $nome, ':email' => $email, ':telefone' => $telefone, ':id' => $idUsuario]);

        $pdo->prepare('INSERT INTO perfis_criadores (id_usuario, biografia, link_portfolio, status_validacao)
            VALUES (:id, :biografia, :link, :status)
            ON DUPLICATE KEY UPDATE biografia = VALUES(biografia), link_portfolio = VALUES(link_portfolio), status_validacao = VALUES(status_validacao)')
            ->execute([
                ':id' => $idUsuario,
                ':biografia' => $biografia,
                ':link' => $linkPortfolio,
                ':status' => $statusValidacao,
            ]);

        $pdo->commit();
        jsonReply(true, 'Perfil atualizado com sucesso.', ['id_usuario' => $idUsuario]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonReply(false, 'Erro ao salvar o perfil: ' . $e->getMessage(), null, 500);
    }
}

if ($action === 'cadastro_receita') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $idCriador = (int)($input['id_criador'] ?? 0);
    $titulo = trim((string)($input['titulo'] ?? ''));
    $descricao = trim((string)($input['descricao_introducao'] ?? ''));

    if (!$idCriador || $titulo === '' || $descricao === '') {
        jsonReply(false, 'Dados da receita incompletos.', null, 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('INSERT INTO receitas (
            id_criador, titulo, descricao_introducao, rendimento, tempo_preparo_minutos,
            nivel_dificuldade, tipo_acesso, preco_conteudo, img, pais, nota, avaliacoes,
            criado_pelo_chef, data_publicacao
        ) VALUES (
            :id_criador, :titulo, :descricao, :rendimento, :tempo,
            :nivel, :tipo_acesso, :preco_conteudo, :img, :pais, :nota, :avaliacoes,
            :criado_pelo_chef, NOW()
        )');

        $stmt->execute([
            ':id_criador' => $idCriador,
            ':titulo' => $titulo,
            ':descricao' => $descricao,
            ':rendimento' => (int)($input['rendimento'] ?? 1),
            ':tempo' => (int)($input['tempo_preparo_minutos'] ?? 0),
            ':nivel' => in_array((string)($input['nivel_dificuldade'] ?? 'facil'), ['facil', 'medio', 'dificil'], true)
                ? (string)$input['nivel_dificuldade']
                : 'facil',
            ':tipo_acesso' => in_array((string)($input['tipo_acesso'] ?? 'gratuito'), ['gratuito', 'exclusivo_pago'], true)
                ? (string)$input['tipo_acesso']
                : 'gratuito',
            ':preco_conteudo' => (float)($input['preco_conteudo'] ?? 0),
            ':img' => trim((string)($input['img'] ?? 'img/pastel.png')) ?: 'img/pastel.png',
            ':pais' => trim((string)($input['pais'] ?? '')) ?: null,
            ':nota' => (float)($input['nota'] ?? 0),
            ':avaliacoes' => (int)($input['avaliacoes'] ?? 0),
            ':criado_pelo_chef' => 1,
        ]);

        $idReceita = (int)$pdo->lastInsertId();

        $restricoes = is_array($input['restricoes'] ?? null) ? $input['restricoes'] : [];
        foreach ($restricoes as $restricao) {
            $r = trim((string)$restricao);
            if ($r !== '') {
                $pdo->prepare('INSERT INTO receitas_restricoes (id_receita, restricao) VALUES (:id, :restricao)')
                    ->execute([':id' => $idReceita, ':restricao' => $r]);
            }
        }

        $urlVideo = trim((string)($input['url_video'] ?? ''));
        $duracao = (int)($input['duracao_segundos'] ?? 0);
        if ($urlVideo !== '' || $duracao > 0) {
            $pdo->prepare('INSERT INTO videoaulas (id_receita, url_video, duracao_segundos) VALUES (:id, :url, :duracao)')
                ->execute([':id' => $idReceita, ':url' => $urlVideo, ':duracao' => $duracao]);
        }

        $oferecerKit = !empty($input['oferecer_kit']);
        if ($oferecerKit) {
            $pdo->prepare('INSERT INTO kits_ingredientes (id_receita, preco_kit, estoque_disponivel) VALUES (:id, :preco, :estoque)')
                ->execute([
                    ':id' => $idReceita,
                    ':preco' => (float)($input['preco_kit'] ?? 0),
                    ':estoque' => (int)($input['estoque_disponivel'] ?? 0),
                ]);
        }

        $ingredientes = is_array($input['ingredientes'] ?? null) ? $input['ingredientes'] : [];
        foreach ($ingredientes as $ordem => $ingrediente) {
            $item = trim((string)$ingrediente);
            if ($item === '') continue;
            $pdo->prepare('INSERT INTO ingredientes_receita (id_receita, ordem, ingrediente) VALUES (:id, :ordem, :item)')
                ->execute([':id' => $idReceita, ':ordem' => $ordem + 1, ':item' => $item]);
        }

        $preparo = is_array($input['preparo'] ?? null) ? $input['preparo'] : [];
        foreach ($preparo as $ordem => $passo) {
            $texto = trim((string)$passo);
            if ($texto === '') continue;
            $pdo->prepare('INSERT INTO preparo_receita (id_receita, ordem, passo) VALUES (:id, :ordem, :passo)')
                ->execute([':id' => $idReceita, ':ordem' => $ordem + 1, ':passo' => $texto]);
        }

        $pdo->commit();
        jsonReply(true, 'Receita criada com sucesso.', ['id_receita' => $idReceita]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonReply(false, 'Erro ao salvar a receita: ' . $e->getMessage(), null, 500);
    }
}

if ($action === 'pedido') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $idCliente = (int)($input['id_cliente'] ?? 0);
    $itens = is_array($input['itens'] ?? null) ? $input['itens'] : [];
    $nomeDestinatario = trim((string)($input['nome_destinatario'] ?? ''));
    $observacoes = trim((string)($input['observacoes'] ?? ''));
    $metodo = (string)($input['metodo_pagamento'] ?? '');
    $endereco = is_array($input['endereco'] ?? null) ? $input['endereco'] : [];
    $cep = preg_replace('/\D+/', '', (string)($endereco['cep'] ?? ''));
    $logradouro = trim((string)($endereco['logradouro'] ?? ''));
    $numero = trim((string)($endereco['numero'] ?? ''));
    $complemento = trim((string)($endereco['complemento'] ?? ''));
    $bairro = trim((string)($endereco['bairro'] ?? ''));
    $cidade = trim((string)($endereco['cidade'] ?? ''));
    $estado = strtoupper(trim((string)($endereco['estado'] ?? '')));
    $bandeiraCartao = strtolower(trim((string)($input['cartao_bandeira'] ?? '')));
    $ultimosQuatro = preg_replace('/\D+/', '', (string)($input['cartao_ultimos4'] ?? ''));

    if (!$idCliente || !$itens || $nomeDestinatario === '' || !in_array($metodo, ['pix', 'cartao', 'boleto', 'transferencia'], true)) {
        jsonReply(false, 'Pedido, destinatário e forma de pagamento são obrigatórios.', null, 400);
    }

    if (strlen($cep) !== 8 || $logradouro === '' || $numero === '' || $bairro === '' || $cidade === '' || !preg_match('/^[A-Z]{2}$/', $estado)) {
        jsonReply(false, 'Informe um endereço de entrega completo.', null, 400);
    }

    if (strlen($observacoes) > 2000) {
        jsonReply(false, 'As observações devem ter no máximo 2.000 caracteres.', null, 400);
    }

    if (strlen($nomeDestinatario) > 100 || strlen($logradouro) > 150 || strlen($numero) > 20
        || strlen($complemento) > 100 || strlen($bairro) > 100 || strlen($cidade) > 100) {
        jsonReply(false, 'Um dos campos do destinatário ou endereço excede o tamanho permitido.', null, 400);
    }

    if ($metodo === 'cartao') {
        $bandeirasAceitas = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outro'];
        if (!in_array($bandeiraCartao, $bandeirasAceitas, true) || strlen($ultimosQuatro) !== 4) {
            jsonReply(false, 'Para o cartão de demonstração, informe a bandeira e os quatro últimos dígitos.', null, 400);
        }
    } else {
        $bandeiraCartao = '';
        $ultimosQuatro = '';
    }

    try {
        $pdo->beginTransaction();
        $cliente = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = :id AND ativo = 1');
        $cliente->execute([':id' => $idCliente]);
        if (!$cliente->fetch()) {
            throw new RuntimeException('Cliente não encontrado ou inativo.');
        }

        $enderecoExistente = $pdo->prepare("SELECT id_endereco FROM enderecos
            WHERE id_usuario = :id_usuario AND cep = :cep AND logradouro = :logradouro
                AND numero = :numero AND COALESCE(complemento, '') = :complemento
                AND bairro = :bairro AND cidade = :cidade AND estado = :estado
            LIMIT 1");
        $enderecoExistente->execute([
            ':id_usuario' => $idCliente,
            ':cep' => $cep,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':estado' => $estado,
        ]);
        $enderecoSalvo = $enderecoExistente->fetch();
        if ($enderecoSalvo) {
            $idEndereco = (int)$enderecoSalvo['id_endereco'];
        } else {
            $enderecosExistentes = $pdo->prepare('SELECT id_endereco FROM enderecos WHERE id_usuario = :id_usuario LIMIT 1');
            $enderecosExistentes->execute([':id_usuario' => $idCliente]);
            $enderecoPadrao = $enderecosExistentes->fetch() ? 0 : 1;
            $enderecoStmt = $pdo->prepare('INSERT INTO enderecos
                (id_usuario, cep, logradouro, numero, complemento, bairro, cidade, estado, endereco_padrao)
                VALUES (:id_usuario, :cep, :logradouro, :numero, :complemento, :bairro, :cidade, :estado, :endereco_padrao)');
            $enderecoStmt->execute([
                ':id_usuario' => $idCliente,
                ':cep' => $cep,
                ':logradouro' => $logradouro,
                ':numero' => $numero,
                ':complemento' => $complemento !== '' ? $complemento : null,
                ':bairro' => $bairro,
                ':cidade' => $cidade,
                ':estado' => $estado,
                ':endereco_padrao' => $enderecoPadrao,
            ]);
            $idEndereco = (int)$pdo->lastInsertId();
        }

        $valorTotal = 0.0;
        $itensConferidos = [];
        foreach ($itens as $item) {
            $idReceita = (int)($item['id_receita'] ?? 0);
            $quantidade = (int)($item['quantidade'] ?? 0);
            if ($idReceita <= 0 || $quantidade <= 0 || $quantidade > 100) {
                throw new RuntimeException('Um dos itens do pedido é inválido.');
            }

            $kitStmt = $pdo->prepare('SELECT k.id_kit, k.preco_kit, k.estoque_disponivel, r.titulo
                FROM kits_ingredientes k
                JOIN receitas r ON r.id_receita = k.id_receita
                WHERE k.id_receita = :id_receita
                FOR UPDATE');
            $kitStmt->execute([':id_receita' => $idReceita]);
            $kit = $kitStmt->fetch();
            if (!$kit) {
                throw new RuntimeException('Um dos kits do pedido não está disponível.');
            }
            if ((int)$kit['estoque_disponivel'] < $quantidade) {
                throw new RuntimeException('Estoque insuficiente para o kit ' . $kit['titulo'] . '.');
            }

            $precoUnitario = (float)$kit['preco_kit'];
            if ($precoUnitario <= 0) {
                throw new RuntimeException('O preço do kit ' . $kit['titulo'] . ' está indisponível.');
            }
            $valorTotal += $precoUnitario * $quantidade;
            $itensConferidos[] = [
                'id_receita' => $idReceita,
                'id_kit' => (int)$kit['id_kit'],
                'nome_produto' => 'Kit ' . $kit['titulo'],
                'quantidade' => $quantidade,
                'preco_unitario' => $precoUnitario,
            ];

            $pdo->prepare('UPDATE kits_ingredientes
                SET estoque_disponivel = estoque_disponivel - :quantidade
                WHERE id_kit = :id_kit AND estoque_disponivel >= :quantidade_confirmacao')
                ->execute([
                    ':quantidade' => $quantidade,
                    ':id_kit' => (int)$kit['id_kit'],
                    ':quantidade_confirmacao' => $quantidade,
                ]);
        }

        $pedidoStmt = $pdo->prepare('INSERT INTO pedidos
            (id_cliente, id_endereco, nome_destinatario, observacoes, entrega_cep, entrega_logradouro, entrega_numero,
             entrega_complemento, entrega_bairro, entrega_cidade, entrega_estado, status_pedido, status_entrega, valor_total)
            VALUES (:id_cliente, :id_endereco, :nome_destinatario, :observacoes, :cep, :logradouro, :numero,
                :complemento, :bairro, :cidade, :estado, :status, :status_entrega, :valor_total)');
        $pedidoStmt->execute([
            ':id_cliente' => $idCliente,
            ':id_endereco' => $idEndereco,
            ':nome_destinatario' => $nomeDestinatario,
            ':observacoes' => $observacoes !== '' ? $observacoes : null,
            ':cep' => $cep,
            ':logradouro' => $logradouro,
            ':numero' => $numero,
            ':complemento' => $complemento !== '' ? $complemento : null,
            ':bairro' => $bairro,
            ':cidade' => $cidade,
            ':estado' => $estado,
            ':status' => 'confirmado',
            ':status_entrega' => 'aguardando_separacao',
            ':valor_total' => number_format($valorTotal, 2, '.', ''),
        ]);

        $idPedido = (int)$pdo->lastInsertId();

        foreach ($itensConferidos as $item) {
            $pdo->prepare('INSERT INTO itens_pedido
                (id_pedido, tipo_item, id_referencia, id_kit, id_receita, nome_produto, quantidade, preco_unitario)
                VALUES (:id_pedido, :tipo_item, :id_referencia, :id_kit, :id_receita, :nome_produto, :quantidade, :preco_unitario)')
                ->execute([
                    ':id_pedido' => $idPedido,
                    ':tipo_item' => 'kit_ingredientes',
                    ':id_referencia' => $item['id_receita'],
                    ':id_kit' => $item['id_kit'],
                    ':id_receita' => $item['id_receita'],
                    ':nome_produto' => $item['nome_produto'],
                    ':quantidade' => $item['quantidade'],
                    ':preco_unitario' => number_format($item['preco_unitario'], 2, '.', ''),
                ]);
        }

        $pagamento = $pdo->prepare('INSERT INTO pagamentos
            (id_pedido, metodo, status, valor, provedor, referencia_transacao, bandeira_cartao, ultimos_quatro)
            VALUES (:id_pedido, :metodo, :status, :valor, :provedor, :referencia, :bandeira, :ultimos_quatro)');
        $pagamento->execute([
            ':id_pedido' => $idPedido,
            ':metodo' => $metodo,
            ':status' => 'aprovado',
            ':valor' => number_format($valorTotal, 2, '.', ''),
            ':provedor' => 'demonstracao',
            ':referencia' => 'DEMO-' . strtoupper(bin2hex(random_bytes(8))),
            ':bandeira' => $metodo === 'cartao' ? $bandeiraCartao : null,
            ':ultimos_quatro' => $metodo === 'cartao' ? $ultimosQuatro : null,
        ]);

        $pdo->commit();
        jsonReply(true, 'Pedido de demonstração registrado com sucesso.', [
            'id_pedido' => $idPedido,
            'valor_total' => $valorTotal,
            'status_pagamento' => 'aprovado',
            'status_entrega' => 'aguardando_separacao',
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $status = $e instanceof PDOException ? 500 : 400;
        jsonReply(false, 'Erro ao registrar pedido: ' . $e->getMessage(), null, $status);
    }
}

if ($action === 'receitas') {
    $stmt = $pdo->query(
        'SELECT r.*, k.preco_kit, k.estoque_disponivel,
                GROUP_CONCAT(DISTINCT rr.restricao ORDER BY rr.restricao SEPARATOR ",") AS restricoes,
                v.url_video, v.duracao_segundos,
                GROUP_CONCAT(DISTINCT i.ingrediente ORDER BY i.ordem SEPARATOR "||") AS ingredientes,
                GROUP_CONCAT(DISTINCT p.passo ORDER BY p.ordem SEPARATOR "||") AS preparo
         FROM receitas r
         LEFT JOIN kits_ingredientes k ON k.id_receita = r.id_receita
         LEFT JOIN receitas_restricoes rr ON rr.id_receita = r.id_receita
         LEFT JOIN videoaulas v ON v.id_receita = r.id_receita
         LEFT JOIN ingredientes_receita i ON i.id_receita = r.id_receita
         LEFT JOIN preparo_receita p ON p.id_receita = r.id_receita
         GROUP BY r.id_receita
         ORDER BY r.data_publicacao DESC, r.id_receita DESC'
    );

    $receitas = [];
    foreach ($stmt->fetchAll() as $receita) {
        $restricoes = $receita['restricoes'] ? explode(',', $receita['restricoes']) : [];
        $restricoes = array_values(array_filter(array_map('trim', $restricoes)));

        $ingredientes = $receita['ingredientes'] ? explode('||', $receita['ingredientes']) : [];
        $preparo = $receita['preparo'] ? explode('||', $receita['preparo']) : [];

        $receitas[] = [
            'id_receita' => (int)$receita['id_receita'],
            'id_criador' => (int)($receita['id_criador'] ?? 0),
            'titulo' => $receita['titulo'],
            'descricao_introducao' => $receita['descricao_introducao'],
            'rendimento' => (int)($receita['rendimento'] ?? 0),
            'tempo_preparo_minutos' => (int)($receita['tempo_preparo_minutos'] ?? 0),
            'nivel_dificuldade' => $receita['nivel_dificuldade'],
            'tipo_acesso' => $receita['tipo_acesso'],
            'preco_conteudo' => (float)($receita['preco_conteudo'] ?? 0),
            'img' => $receita['img'] ?: 'img/pastel.png',
            'pais' => $receita['pais'],
            'nota' => (float)($receita['nota'] ?? 0),
            'avaliacoes' => (int)($receita['avaliacoes'] ?? 0),
            'restricoes' => $restricoes,
            'ingredientes' => $ingredientes,
            'preparo' => $preparo,
            'url_video' => $receita['url_video'] ?? '',
            'duracao_segundos' => (int)($receita['duracao_segundos'] ?? 0),
            'preco_kit' => (float)($receita['preco_kit'] ?? 0),
            'estoque_disponivel' => (int)($receita['estoque_disponivel'] ?? 0),
            'criado_pelo_chef' => (bool)($receita['criado_pelo_chef'] ?? true),
            'data_publicacao' => $receita['data_publicacao'] ?? null,
        ];
    }

    jsonReply(true, 'Receitas carregadas com sucesso.', $receitas);
}

jsonReply(false, 'Ação inválida.', null, 400);
