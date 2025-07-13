// /api/criar-pagamento.js (Corrigido para o SDK v2 do Mercado Pago)

// 1. Importa os componentes necessários do SDK
const { MercadoPagoConfig, Preference } = require('mercadopago');

// 2. Inicializa o cliente com seu Access Token
const client = new MercadoPagoConfig({ 
    accessToken: process.env.ME_ACCESS_TOKEN 
});

// A função serverless que vai receber os dados do carrinho
module.exports = async (request, response) => {
    // Permite que seu site faça requisições para esta função (CORS)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    try {
        const cartItems = request.body.items;

        if (!cartItems || cartItems.length === 0) {
            return response.status(400).json({ error: 'O carrinho está vazio.' });
        }

        // Formata os itens para a API do Mercado Pago
        const items_preference = cartItems.map(item => ({
            id: item.id, // Opcional, mas bom para referência
            title: item.nome,
            unit_price: item.preco,
            quantity: item.quantidade,
            currency_id: 'BRL'
        }));

        const preferenceBody = {
            items: items_preference,
            back_urls: {
                success: 'https://jhan-presentes-hq3k.vercel.app/pagamento_concluido.html',
                failure: 'https://jhan-presentes-hq3k.vercel.app/pagamento_falhou.html',
                pending: 'https://jhan-presentes-hq3k.vercel.app/pagamento_pendente.html'
            },
            auto_return: 'approved',
        };
        
        // 3. Cria o objeto de Preferência usando o cliente
        const preference = new Preference(client);
        const result = await preference.create({ body: preferenceBody });
        
        // 4. Retorna o ID da preferência para o front-end
        response.status(201).json({ preference_id: result.id });

    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        response.status(500).json({ 
            error: 'Falha ao iniciar o pagamento.',
            details: error.message 
        });
    }
};