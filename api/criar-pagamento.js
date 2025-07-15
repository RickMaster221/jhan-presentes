// /api/criar-pagamento.js (Versão Final com TODAS as melhorias de qualidade)

const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

module.exports = async (request, response) => {
    // Configuração de CORS
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
        const { items, payer } = request.body;

        if (!items || items.length === 0) {
            return response.status(400).json({ error: 'O carrinho está vazio.' });
        }
        if (!payer || !payer.first_name || !payer.last_name) {
            return response.status(400).json({ error: 'Dados do comprador ausentes.' });
        }

        // Mapeia os itens adicionando os campos de qualidade
        const items_preference = items.map(item => ({
            id: item.id,
            title: item.nome,
            description: item.descricao, // Campo de descrição do item
            category_id: item.categoriaId, // Campo de categoria do item
            unit_price: item.preco,
            quantity: item.quantidade,
            currency_id: 'BRL'
        }));
        
        const preferenceBody = {
            items: items_preference,
            // Adiciona o objeto 'payer' com os dados do comprador
            payer: {
                first_name: payer.first_name,
                last_name: payer.last_name
            },
            back_urls: {
                success: 'https://jhan-presentes.vercel.app/pagamento_concluido.html',
                failure: 'https://jhan-presentes.vercel.app/pagamento_falhou.html',
                pending: 'https://jhan-presentes.vercel.app/pagamento_pendente.html'
            },
            auto_return: 'approved',
            notification_url: 'https://jhan-presentes.vercel.app/api/webhook-mercadopago',
            external_reference: `JHAN_PRESENTES_${Date.now()}`
        };
        
        const preference = new Preference(client);
        const result = await preference.create({ body: preferenceBody });
        
        response.status(201).json({ preference_id: result.id });

    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error.response ? error.response.data : error.message);
        response.status(500).json({ 
            error: 'Falha ao iniciar o pagamento.',
            details: error.response ? error.response.data.message : error.message
        });
    }
};