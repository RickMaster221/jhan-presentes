// /api/criar-pagamento.js
const mercadopago = require('mercadopago');

// Configura o Mercado Pago com seu Access Token SECRETO
// (Vamos configurar isso nas variáveis de ambiente da Vercel)
mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN,
});

// A função serverless que vai receber os dados do carrinho
module.exports = async (request, response) => {
    // Permite que seu site faça requisições para esta função
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const cartItems = request.body.items;

    if (!cartItems || cartItems.length === 0) {
        return response.status(400).json({ error: 'O carrinho está vazio.' });
    }

    // Formata os itens para a API do Mercado Pago
    const items_preference = cartItems.map(item => ({
        title: item.nome,
        unit_price: item.preco,
        quantity: item.quantidade,
        currency_id: 'BRL'
    }));

    const preference = {
        items: items_preference,
        back_urls: {
            success: 'https://jhan-presentes.vercel.app/pagamento_concluido.html', // Crie esta página
            failure: 'https://jhan-presentes.vercel.app/pagamento_falhou.html',   // Crie esta página
            pending: 'https://jhan-presentes.vercel.app/pagamento_pendente.html'  // Crie esta página
        },
        auto_return: 'approved',
    };

    try {
        const result = await mercadopago.preferences.create(preference);
        // Retorna o ID da preferência para o front-end
        response.status(201).json({ preference_id: result.body.id });
    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        response.status(500).json({ error: 'Falha ao iniciar o pagamento.' });
    }
};