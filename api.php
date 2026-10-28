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

function cnpjLooksValid(string $cnpj): bool
{
    $cnpj = preg_replace('/\D+/', '', $cnpj);
    if (strlen($cnpj) !== 14) {
        return false;
    }
    if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
        return false;
    }

    $peso1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    $peso2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];

    $soma = 0;
    for ($i = 0; $i < 12; $i++) {
        $soma += (int)$cnpj[$i] * $peso1[$i];
    }
    $digito1 = $soma % 11 < 2 ? 0 : 11 - ($soma % 11);

    if ((int)$cnpj[12] !== $digito1) {
        return false;
    }

    $soma = 0;
    for ($i = 0; $i < 13; $i++) {
        $soma += (int)$cnpj[$i] * $peso2[$i];
    }
    $digito2 = $soma % 11 < 2 ? 0 : 11 - ($soma % 11);

    return (int)$cnpj[13] === $digito2;
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
        jsonReply(false, 'Chef e restaurante devem informar um CNPJ válido.', null, 400);
    }

    if (in_array($tipo, ['chef', 'restaurante'], true) && !cnpjLooksValid($cnpj)) {
        jsonReply(false, 'O CNPJ informado não é válido.', null, 400);
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
        ':cnpj_validado' => in_array($tipo, ['chef', 'restaurante'], true) ? 1 : 0,
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
            ':img' => trim((string)($input['img'] ?? 'img/pastel.jpg')) ?: 'img/pastel.jpg',
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

    if (!$idCliente || !$itens) {
        jsonReply(false, 'Pedido incompleto.', null, 400);
    }

    try {
        $pdo->beginTransaction();
        $valorTotal = 0.0;
        foreach ($itens as $item) {
            $valorTotal += (float)($item['preco_unitario'] ?? 0) * (int)($item['quantidade'] ?? 1);
        }

        $pedidoStmt = $pdo->prepare('INSERT INTO pedidos (id_cliente, status_pedido, valor_total) VALUES (:id_cliente, :status, :valor_total)');
        $pedidoStmt->execute([
            ':id_cliente' => $idCliente,
            ':status' => 'pendente',
            ':valor_total' => number_format($valorTotal, 2, '.', ''),
        ]);

        $idPedido = (int)$pdo->lastInsertId();

        foreach ($itens as $item) {
            $tipoItem = in_array((string)($item['tipo_item'] ?? 'kit_ingredientes'), ['kit_ingredientes', 'receita'], true)
                ? (string)$item['tipo_item']
                : 'kit_ingredientes';

            $pdo->prepare('INSERT INTO itens_pedido (id_pedido, tipo_item, id_referencia, quantidade, preco_unitario)
                VALUES (:id_pedido, :tipo_item, :id_referencia, :quantidade, :preco_unitario)')
                ->execute([
                    ':id_pedido' => $idPedido,
                    ':tipo_item' => $tipoItem,
                    ':id_referencia' => (int)($item['id_referencia'] ?? 0),
                    ':quantidade' => (int)($item['quantidade'] ?? 1),
                    ':preco_unitario' => number_format((float)($item['preco_unitario'] ?? 0), 2, '.', ''),
                ]);
        }

        $pdo->commit();
        jsonReply(true, 'Pedido registrado com sucesso.', ['id_pedido' => $idPedido, 'valor_total' => $valorTotal]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonReply(false, 'Erro ao registrar pedido: ' . $e->getMessage(), null, 500);
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
            'img' => $receita['img'] ?: 'img/pastel.jpg',
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
