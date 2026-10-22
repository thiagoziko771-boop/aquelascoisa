<?php
/**
 * Camada de integração PIX — Blackcat Pay.
 *
 * Substitui a antiga integração Mangofy. Os endpoints do funil
 * (pagamento.php, verificar.php, pagamento-upsell.php, pagamento-upsell2.php)
 * usam exclusivamente as funções deste arquivo.
 *
 * Docs: https://docs.blackcatoficial.com/
 *   POST {base}/sales/create-sale
 *   GET  {base}/sales/{transactionId}/status
 *   Header: X-API-Key
 *   Valores sempre em centavos.
 */

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

/** Configuração carregada uma única vez. */
function bc_config()
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

/** Cabeçalhos padrão de resposta JSON (sem cache). */
function bc_send_json(array $payload, $httpCode = 200)
{
    if (!headers_sent()) {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function bc_fail($message, $httpCode = 400)
{
    bc_send_json(['success' => false, 'message' => $message], $httpCode);
}

/** Lê o corpo JSON (ou form-urlencoded) da requisição. */
function bc_read_input()
{
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
        parse_str($raw, $parsed);
        if (is_array($parsed) && $parsed) {
            return $parsed;
        }
    }
    return is_array($_POST) ? $_POST : [];
}

function bc_only_digits($value)
{
    return preg_replace('/\D+/', '', (string) $value);
}

/** Corta texto respeitando acentos; funciona mesmo sem a extensão mbstring. */
function bc_cut($value, $length)
{
    $value = (string) $value;
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $length, 'UTF-8');
    }
    // Sem mbstring: corta por bytes sem partir caractere UTF-8 ao meio.
    if (strlen($value) <= $length) {
        return $value;
    }
    $cortado = substr($value, 0, $length);
    while ($cortado !== '' && (ord($cortado[strlen($cortado) - 1]) & 0xC0) === 0x80) {
        $cortado = substr($cortado, 0, -1);
    }
    return rtrim($cortado);
}

function bc_log($message, array $context = [])
{
    $line = '[blackcat] ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    error_log($line);
}

/**
 * Chamada HTTP à API da Blackcat.
 * Usa cURL quando disponível e cai para stream context quando não houver.
 *
 * @return array{status:int,body:array|null,raw:string,error:string}
 */
function bc_request($method, $path, array $body = null)
{
    $config = bc_config();
    $url = rtrim($config['api_base'], '/') . '/' . ltrim($path, '/');
    $payload = $body === null
        ? null
        : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-API-Key: ' . $config['secret_key'],
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => (int) $config['timeout'],
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $raw = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method'        => strtoupper($method),
                'header'        => implode("\r\n", $headers),
                'content'       => $payload,
                'timeout'       => (int) $config['timeout'],
                'ignore_errors' => true,
            ],
        ]);
        $raw = @file_get_contents($url, false, $context);
        $error = $raw === false ? 'Falha na conexão com o gateway.' : '';
        $status = 0;
        if (isset($http_response_header[0]) &&
            preg_match('{HTTP/\S+\s+(\d{3})}', $http_response_header[0], $m)) {
            $status = (int) $m[1];
        }
    }

    $decoded = null;
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = null;
        }
    }

    return [
        'status' => $status,
        'body'   => $decoded,
        'raw'    => is_string($raw) ? $raw : '',
        'error'  => $error,
    ];
}

/** Normaliza o telefone para o formato aceito pela Blackcat (só dígitos). */
function bc_normalize_phone($phone)
{
    $digits = bc_only_digits($phone);
    if (strlen($digits) > 11 && strpos($digits, '55') === 0) {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) < 10) {
        // Telefone inválido/ausente: gera um número plausível para não travar a venda.
        $ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '19', '27', '47', '48', '62', '98'];
        $digits = $ddds[array_rand($ddds)] . '9';
        for ($i = 0; $i < 8; $i++) {
            $digits .= random_int(0, 9);
        }
    }
    return substr($digits, 0, 11);
}

/** Monta o bloco customer a partir do payload vindo do front. */
function bc_build_customer(array $input)
{
    $nome = trim((string) (
        $input['nome'] ?? $input['name'] ?? $input['NOME'] ?? ''
    ));
    if ($nome === '') {
        $nome = 'Cliente';
    }

    $documento = bc_only_digits($input['cpf'] ?? $input['document'] ?? $input['documento'] ?? '');
    if (strlen($documento) !== 11 && strlen($documento) !== 14) {
        return [null, 'Informe um CPF válido para gerar o PIX.'];
    }

    $email = trim((string) ($input['email'] ?? $input['EMAIL'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = 'cliente+' . substr($documento, -6) . '@email.com';
    }

    $customer = [
        'name'     => bc_cut($nome, 120),
        'email'    => $email,
        'phone'    => bc_normalize_phone($input['telefone'] ?? $input['phone'] ?? $input['celular'] ?? ''),
        'document' => [
            'number' => $documento,
            'type'   => strlen($documento) === 14 ? 'cnpj' : 'cpf',
        ],
    ];

    return [$customer, null];
}

/** Repassa os parâmetros de rastreio recebidos do front. */
function bc_tracking_fields(array $input)
{
    $allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    $out = [];
    foreach ($allowed as $field) {
        $value = trim((string) ($input[$field] ?? ''));
        if ($value !== '') {
            $out[$field] = bc_cut($value, 255);
        }
    }
    return $out;
}

/** Guarda os dados do cliente na sessão para as páginas seguintes do funil. */
function bc_remember_customer(array $input, array $customer)
{
    $_SESSION['bc_customer'] = [
        'nome'       => $customer['name'],
        'email'      => $customer['email'],
        'cpf'        => $customer['document']['number'],
        'telefone'   => $customer['phone'],
        'nascimento' => trim((string) ($input['nascimento'] ?? $input['NASC'] ?? '')),
        'municipio'  => trim((string) ($input['municipio'] ?? $input['cidade'] ?? '')),
        'uf'         => trim((string) ($input['uf'] ?? $input['estado'] ?? '')),
        'nome_mae'   => trim((string) ($input['nome_mae'] ?? $input['NOME_MAE'] ?? '')),
        'sexo'       => trim((string) ($input['sexo'] ?? $input['SEXO'] ?? '')),
    ];
}

/**
 * Cria uma cobrança PIX na Blackcat e devolve a resposta já no formato
 * que o front do funil espera.
 *
 * @param string $offer Chave em config['amounts'] — principal|upsell1|upsell2
 */
function bc_criar_pix($offer, array $input)
{
    $config = bc_config();

    if (!isset($config['amounts'][$offer])) {
        bc_log('oferta desconhecida', ['offer' => $offer]);
        bc_fail('Oferta não configurada.', 500);
    }

    // O valor NUNCA vem do navegador: é fixado aqui no servidor.
    $amount = (int) $config['amounts'][$offer];
    $title = $config['titles'][$offer] ?? 'Serviço';

    list($customer, $erro) = bc_build_customer($input);
    if ($erro !== null) {
        bc_fail($erro, 422);
    }
    bc_remember_customer($input, $customer);

    $body = [
        'amount'        => $amount,
        'currency'      => 'BRL',
        'paymentMethod' => 'pix',
        'items'         => [[
            'title'     => $title,
            'unitPrice' => $amount,
            'quantity'  => 1,
            'tangible'  => false,
        ]],
        'customer'    => $customer,
        'pix'         => ['expiresInDays' => (int) $config['pix_expires_in_days']],
        'externalRef' => strtoupper($offer) . '-' . date('Ymd-His') . '-' . substr($customer['document']['number'], -4),
        'metadata'    => $title,
    ];

    if (!empty($config['postback_url'])) {
        $body['postbackUrl'] = $config['postback_url'];
    }
    $body = array_merge($body, bc_tracking_fields($input));

    $response = bc_request('POST', '/sales/create-sale', $body);

    if ($response['error'] !== '') {
        bc_log('erro de conexão ao criar venda', ['erro' => $response['error']]);
        bc_fail('Não foi possível conectar ao processador de pagamento. Tente novamente.', 502);
    }

    $data = isset($response['body']['data']) && is_array($response['body']['data'])
        ? $response['body']['data']
        : (is_array($response['body']) ? $response['body'] : []);

    $ok = $response['status'] >= 200 && $response['status'] < 300
        && (!isset($response['body']['success']) || $response['body']['success'] === true);

    if (!$ok) {
        $mensagem = $response['body']['message']
            ?? $response['body']['error']
            ?? 'O processador de pagamento recusou a cobrança.';
        bc_log('venda recusada', ['http' => $response['status'], 'resposta' => bc_cut($response['raw'], 500)]);
        bc_fail(is_string($mensagem) ? $mensagem : 'Não foi possível gerar o PIX.', 502);
    }

    $paymentData = isset($data['paymentData']) && is_array($data['paymentData']) ? $data['paymentData'] : [];

    $transactionId = (string) ($data['transactionId'] ?? $data['id'] ?? '');
    $pixCode = (string) ($paymentData['copyPaste'] ?? $paymentData['qrCode'] ?? '');
    $qrBase64 = (string) ($paymentData['qrCodeBase64'] ?? '');

    if ($transactionId === '' || $pixCode === '') {
        bc_log('resposta incompleta da Blackcat', ['resposta' => bc_cut($response['raw'], 500)]);
        bc_fail('O PIX não foi retornado pelo processador. Tente novamente.', 502);
    }

    // O front usa qrCodeUrl direto no src da <img>.
    $qrCodeUrl = '';
    if ($qrBase64 !== '') {
        $qrCodeUrl = strpos($qrBase64, 'data:') === 0 ? $qrBase64 : 'data:image/png;base64,' . $qrBase64;
    }

    $retornoAmount = isset($data['amount']) ? (int) $data['amount'] : $amount;

    return [
        'success'       => true,
        // Mesmo id em dois nomes: o funil lê paymentCode em algumas páginas e token em outras.
        'paymentCode'   => $transactionId,
        'token'         => $transactionId,
        'pixCode'       => $pixCode,
        'pixCopiaECola' => $pixCode,
        'qrCodeUrl'     => $qrCodeUrl,
        'amount'        => $retornoAmount,
        'expiresAt'     => (string) ($paymentData['expiresAt'] ?? ''),
        'status'        => 'pending',
    ];
}

/** Traduz o status da Blackcat para o vocabulário usado pelo front. */
function bc_traduzir_status($status)
{
    $status = strtolower(trim((string) $status));

    $aprovados = ['paid', 'approved', 'completed', 'complete', 'confirmed', 'success'];
    $cancelados = ['cancelled', 'canceled', 'refused', 'rejected', 'failed', 'chargeback'];

    if (in_array($status, $aprovados, true)) {
        return ['approved', true];
    }
    if ($status === 'refunded') {
        return ['refunded', false];
    }
    if ($status === 'expired') {
        return ['expired', false];
    }
    if (in_array($status, $cancelados, true)) {
        return ['cancelled', false];
    }
    return ['pending', false];
}

/** Consulta o status de uma cobrança já criada. */
function bc_consultar_status($transactionId)
{
    $transactionId = trim((string) $transactionId);
    if ($transactionId === '' || !preg_match('/^[A-Za-z0-9._\-]{6,120}$/', $transactionId)) {
        bc_fail('Código do pagamento inválido.', 422);
    }

    $response = bc_request('GET', '/sales/' . rawurlencode($transactionId) . '/status');

    if ($response['error'] !== '') {
        bc_log('erro de conexão ao consultar status', ['erro' => $response['error']]);
        bc_fail('Não foi possível consultar o pagamento agora.', 502);
    }

    $data = isset($response['body']['data']) && is_array($response['body']['data'])
        ? $response['body']['data']
        : (is_array($response['body']) ? $response['body'] : []);

    $ok = $response['status'] >= 200 && $response['status'] < 300
        && (!isset($response['body']['success']) || $response['body']['success'] === true);

    if (!$ok) {
        $mensagem = $response['body']['message'] ?? 'Pagamento não encontrado.';
        bc_log('consulta recusada', ['http' => $response['status'], 'id' => $transactionId]);
        bc_fail(is_string($mensagem) ? $mensagem : 'Pagamento não encontrado.', 404);
    }

    list($status, $pago) = bc_traduzir_status($data['status'] ?? '');

    return [
        'success'       => true,
        'status'        => $status,
        'paid'          => $pago,
        'paymentCode'   => (string) ($data['transactionId'] ?? $transactionId),
        'amount'        => isset($data['amount']) ? (int) $data['amount'] : null,
        'paidAt'        => (string) ($data['paidAt'] ?? ''),
        'gatewayStatus' => (string) ($data['status'] ?? ''),
    ];
}
