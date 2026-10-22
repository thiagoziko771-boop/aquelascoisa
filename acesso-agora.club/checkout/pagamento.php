<?php
/**
 * Checkout principal — PIX de R$ 61,20 (6120 centavos) via Blackcat.
 * Chamado por checkout/index.html.
 */

require __DIR__ . '/blackcat.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    bc_fail('Método não permitido.', 405);
}

bc_send_json(bc_criar_pix('principal', bc_read_input()));
