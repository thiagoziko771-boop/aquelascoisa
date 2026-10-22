<?php
/**
 * Credenciais e valores do funil — Blackcat Pay.
 *
 * ATENÇÃO: este arquivo contém a chave privada (sk_live_...).
 * Ele NUNCA deve ser servido como texto. Mantenha o PHP ativo no servidor
 * e, se possível, bloqueie o acesso direto pelo .htaccess.
 */

return [
    // Base da API de produção (sem barra no final).
    'api_base' => 'https://api.blackcatoficial.com/api',

    // Chave API / Privada — usada só aqui no servidor.
    'secret_key' => getenv('BLACKCAT_SECRET_KEY') ?: 'SUA_SECRET_KEY_AQUI',

    // Chave pública — não é usada no fluxo PIX, fica registrada por referência.
    'public_key' => getenv('BLACKCAT_PUBLIC_KEY') ?: 'SUA_PUBLIC_KEY_AQUI',

    // URL de webhook da Blackcat (opcional). Deixe vazio se não usar.
    'postback_url' => '',

    // Dias de validade do PIX gerado.
    'pix_expires_in_days' => 1,

    // Valores em CENTAVOS. Fonte única da verdade — o front não pode alterar.
    'amounts' => [
        'principal' => 6120, // checkout/        -> R$ 61,20
        'upsell1'   => 5790, // up/              -> R$ 57,90
        'upsell2'   => 7132, // up2/             -> R$ 71,32
    ],

    // Nome que chega na venda (aparece no painel da Blackcat e na fatura).
    'titles' => [
        'principal' => 'SHOPIFY LOJA 3', // checkout/
        'upsell1'   => 'SHOPIFY LOJA 2', // up/
        'upsell2'   => 'SHOPIFY LOJA 4', // up2/
    ],

    // Timeout das chamadas HTTP à Blackcat, em segundos.
    'timeout' => 30,
];
