<?php
/**
 * Devolve os dados que o cliente já informou no funil, para o up2/
 * preencher o formulário sem pedir tudo de novo.
 */

require __DIR__ . '/blackcat.php';

$customer = isset($_SESSION['bc_customer']) && is_array($_SESSION['bc_customer'])
    ? $_SESSION['bc_customer']
    : null;

if (!$customer) {
    bc_fail('Nenhum cadastro encontrado nesta sessão.', 404);
}

bc_send_json(['success' => true, 'customer' => $customer]);
