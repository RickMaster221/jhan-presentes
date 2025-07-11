// /api/calcular-frete.js
const axios = require('axios');

module.exports = async (request, response) => {
    // Configurações de CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { de_cep, para_cep, produtos } = request.body;
    const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;

    // Monta o objeto de produtos no formato que a API do Melhor Envio espera
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
        from: { postal_code: de_cep },
        to: { postal_code: para_cep },
        products: products_payload
    };

    try {
        const me_response = await axios.post('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                'User-Agent': 'NomeDaSuaLoja (seuemail@dominio.com)'
            }
        });

        // Filtra para mostrar apenas as opções válidas (sem erro)
        const opcoesValidas = me_response.data.filter(opcao => !opcao.error);
        response.status(200).json(opcoesValidas);

    } catch (error) {
        console.error("Erro na API do Melhor Envio:", error.response ? error.response.data : error.message);
        response.status(500).json({ error: 'Não foi possível calcular o frete.' });
    }
};