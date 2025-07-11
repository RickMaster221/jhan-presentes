// /api/calcular-frete.js
const axios = require('axios');

module.exports = async (request, response) => {
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
        const { de_cep, para_cep, produtos, to_address } = request.body;
        const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;

        if (!de_cep || !para_cep || !produtos || produtos.length === 0) {
            return response.status(400).json({ error: 'Dados insuficientes para calcular o frete.' });
        }
        
        const products_payload = produtos.map(p => ({
            id: p.id,
            width: p.largura_cm,
            height: p.altura_cm,
            length: p.comprimento_cm,
            weight: p.peso_kg,
            insurance_value: p.preco,
            quantity: p.quantidade
        }));

        const payload = {
            from: { postal_code: String(de_cep) },
            to: { 
                postal_code: String(para_cep),
                address: to_address.address,
                number: to_address.number,
                neighborhood: to_address.neighborhood,
                city: to_address.city,
                state_abbr: to_address.state
            },
            products: products_payload
        };
        
        const me_response = await axios.post(
            'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate', 
            payload, 
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                    'User-Agent': 'Jhan Presentes (seuemail@provedor.com)'
                }
            }
        );

        const opcoesValidas = me_response.data.filter(opcao => !opcao.error);
        response.status(200).json(opcoesValidas);

    } catch (error) {
        console.error("ERRO DETALHADO NA API DO MELHOR ENVIO:", error.response ? error.response.data : "Erro na requisição");
        response.status(500).json({ 
            error: 'Não foi possível calcular o frete.',
            details: error.response ? error.response.data : error.message
        });
    }
};