<?php
/**
 * Upsell 2 (up2/) — PIX de R$ 71,32 (7132 centavos) via Blackcat.
 * O app.js do up2 confere o campo amount antes de exibir o QR Code.
 */

require __DIR__ . '/blackcat.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    bc_fail('Método não permitido.', 405);
}

bc_send_json(bc_criar_pix('upsell2', bc_read_input()));
