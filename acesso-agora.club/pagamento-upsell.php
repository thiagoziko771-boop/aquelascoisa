<?php
/**
 * Upsell 1 (up/) — PIX de R$ 57,90 (5790 centavos) via Blackcat.
 * Fica na raiz do site porque up/index.html chama ../pagamento-upsell.php.
 */

require __DIR__ . '/checkout/blackcat.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    bc_fail('Método não permitido.', 405);
}

bc_send_json(bc_criar_pix('upsell1', bc_read_input()));
