<?php
/**
 * Consulta de status do PIX na Blackcat.
 * Usado pelo checkout principal, pelo up/ e pelo up2/.
 */

require __DIR__ . '/blackcat.php';

$id = $_GET['id'] ?? $_GET['token'] ?? $_GET['paymentCode'] ?? '';

bc_send_json(bc_consultar_status($id));
