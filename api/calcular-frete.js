// /api/calcular-frete.js (Versão com diagnóstico e simplificação)
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

    try {
        const { de_cep, para_cep, produtos } = request.body;
        const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;

        // Validação de dados de entrada
        if (!de_cep || !para_cep || !produtos || produtos.length === 0) {
            return response.status(400).json({ error: 'Dados insuficientes para calcular o frete (CEP de origem, CEP de destino e produtos são obrigatórios).' });
        }

        const payload = {
            from: { postal_code: String(de_cep) },
            to: { postal_code: String(para_cep) },
            // Simplificando o payload de produtos para o teste inicial
            // A API do Melhor Envio é flexível e pode calcular com apenas uma das estruturas
            package: {
                height: produtos.reduce((sum, p) => sum + (p.altura_cm * p.quantidade), 0),
                width: Math.max(...produtos.map(p => p.largura_cm)),
                length: Math.max(...produtos.map(p => p.comprimento_cm)),
                weight: produtos.reduce((sum, p) => sum + (p.peso_kg * p.quantidade), 0)
            }
        };
        
        console.log("Enviando para Melhor Envio:", JSON.stringify(payload, null, 2)); // Log para ver o que está sendo enviado

        const me_response = await axios.post(
            'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate', 
            payload, 
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                    'User-Agent': 'Jhan Presentes (ricardopiresdecarvalhojunior@gmail.com)'
                }
            }
        );

        const opcoesValidas = me_response.data.filter(opcao => !opcao.error);
        response.status(200).json(opcoesValidas);

    } catch (error) {
        // --- LOG DE ERRO DETALHADO ---
        console.error("ERRO DETALHADO NA API DO MELHOR ENVIO:");
        if (error.response) {
            // A requisição foi feita e o servidor respondeu com um status de erro
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
            console.error("Headers:", error.response.headers);
        } else if (error.request) {
            // A requisição foi feita mas nenhuma resposta foi recebida
            console.error("Request:", error.request);
        } else {
            // Algo aconteceu ao configurar a requisição que acionou um erro
            console.error('Error', error.message);
        }
        
        response.status(500).json({ 
            error: 'Não foi possível calcular o frete.',
            details: error.response ? error.response.data : error.message
        });
    }
};