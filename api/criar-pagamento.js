// /api/criar-pagamento.js (Versão Final com Qualidade de Integração)

const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

module.exports = async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-control-Allow-Headers', 'Content-Type');

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

        const items_preference = cartItems.map(item => ({
            id: item.id,
            title: item.nome,
            unit_price: item.preco,
            quantity: item.quantidade,
            currency_id: 'BRL'
        }));

        // Cria um código único para esta transação específica
        const externalReference = `JHAN_PRESENTES_${Date.now()}`;

        const preferenceBody = {
            items: items_preference,
            back_urls: {
                // URLs corrigidas para o seu domínio principal
                success: 'https://jhan-presentes.vercel.app/pagamento_concluido.html',
                failure: 'https://jhan-presentes.vercel.app/pagamento_falhou.html',
                pending: 'https://jhan-presentes.vercel.app/pagamento_pendente.html'
            },
            auto_return: 'approved',
            // --- CAMPOS ADICIONADOS PARA A QUALIDADE DA INTEGRAÇÃO ---
            notification_url: 'https://jhan-presentes.vercel.app/api/webhook-mercadopago',
            external_reference: externalReference
        };
        
        const preference = new Preference(client);
        const result = await preference.create({ body: preferenceBody });
        
        response.status(201).json({ preference_id: result.id });

    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        response.status(500).json({ 
            error: 'Falha ao iniciar o pagamento.',
            details: error.message 
        });
    }
};