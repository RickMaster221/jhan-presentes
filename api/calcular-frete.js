// /api/calcular-frete.js (Corrigido para usar a URL do Sandbox)
const axios = require('axios');

module.exports = async (request, response) => {
    // ... (Configurações de CORS e verificação do método continuam iguais)

    const { de_cep, para_cep, produtos, to_address } = request.body; // Adicionado to_address
    const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;

    const products_payload = produtos.map(p => ({
        id: p.id,
        width: p.largura_cm,
        height: p.altura_cm,
        length: p.comprimento_cm,
        weight: p.peso_kg,
        insurance_value: p.preco,
        quantity: p.quantidade
    }));
    
    // O payload agora pode incluir o endereço completo, mas para o cálculo só o CEP é obrigatório
    const payload = {
        from: { postal_code: de_cep },
        to: { 
            postal_code: para_cep,
            ...to_address // Inclui rua, número, etc. se forem passados
        },
        products: products_payload
    };

    try {
        // --- URL CORRIGIDA PARA O AMBIENTE DE TESTE (SANDBOX) ---
        const me_response = await axios.post('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate', payload, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                'User-Agent': 'Jhan Presentes (ricardopiresdecarvalhojunior@gmail.com)'
            }
        });

        const opcoesValidas = me_response.data.filter(opcao => !opcao.error);
        response.status(200).json(opcoesValidas);

    } catch (error) {
        console.error("Erro na API do Melhor Envio:", error.response ? error.response.data : error.message);
        response.status(500).json({ error: 'Não foi possível calcular o frete.' });
    }
};