// js/importar-produtos.js (Atualizado para incluir peso e dimensões)
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE_PATH = path.join(__dirname, 'config.json');
const OUTPUT_FILE = 'produtos-ml.json';

// --- FUNÇÕES AUXILIARES ---
// (As funções getConfig, saveConfig, fetchJSON, e refreshAccessToken continuam as mesmas)
function getConfig() {
    try {
        const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        return JSON.parse(configFile);
    } catch (e) {
        console.error("Erro: Não foi possível ler o arquivo 'config.json'. Certifique-se de que ele existe e está no formato JSON correto.");
        process.exit(1);
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchJSON(res.headers.location, options).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.error) {
                        return reject({ statusCode: res.statusCode, error: jsonData });
                    }
                    resolve(jsonData);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function refreshAccessToken() {
    console.log("⚠️ Token de acesso expirado. Tentando renovar...");
    const config = getConfig();
    
    const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.ML_APP_ID,
        client_secret: config.ML_SECRET_KEY,
        refresh_token: config.ML_REFRESH_TOKEN
    }).toString();

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request('https://api.mercadolibre.com/oauth/token', options, (res) => {
             let data = '';
             res.on('data', chunk => data += chunk);
             res.on('end', () => {
                try {
                    const newTokenData = JSON.parse(data);
                    if (newTokenData.error) {
                       return reject(new Error(newTokenData.error_description || 'Erro ao renovar token.'));
                    }
                    config.ML_ACCESS_TOKEN = newTokenData.access_token;
                    config.ML_REFRESH_TOKEN = newTokenData.refresh_token;
                    saveConfig(config);
                    
                    console.log("✅ Token do Mercado Livre renovado e salvo com sucesso!");
                    resolve(config.ML_ACCESS_TOKEN);
                } catch(e) { reject(e); }
             });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}


// --- LÓGICA PRINCIPAL ---

async function main() {
    let config = getConfig();
    let accessToken = config.ML_ACCESS_TOKEN;

    console.log('Verificando token e buscando ID do Vendedor...');
    let userId;
    try {
        const userMeUrl = 'https://api.mercadolibre.com/users/me';
        const userMeData = await fetchJSON(userMeUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        userId = userMeData.id;
    } catch (err) {
        if (err && err.statusCode === 401) {
            try {
                accessToken = await refreshAccessToken();
                const userMeUrl = 'https://api.mercadolibre.com/users/me';
                const userMeData = await fetchJSON(userMeUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                userId = userMeData.id;
            } catch (refreshErr) {
                console.error("ERRO CRÍTICO: Falha ao renovar o token.", refreshErr.message);
                return;
            }
        } else {
            console.error("Erro desconhecido ao buscar usuário:", err);
            return;
        }
    }

    if (!userId) {
        console.log('Não foi possível obter o ID do usuário.');
        return;
    }
    console.log(`ID do Vendedor encontrado: ${userId}`);

    console.log('Buscando todos os anúncios ativos (com paginação)...');
    const allItemIds = [];
    let offset = 0;
    const limit = 50;

    while (true) {
        const itemListUrl = `https://api.mercadolibre.com/users/${userId}/items/search?status=active&offset=${offset}&limit=${limit}`;
        const itemListData = await fetchJSON(itemListUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const itemIdsOnPage = itemListData.results;

        if (!itemIdsOnPage || itemIdsOnPage.length === 0) break;
        
        allItemIds.push(...itemIdsOnPage);
        offset += limit;
        console.log(`... ${allItemIds.length} anúncios encontrados até agora.`);
    }

    if (allItemIds.length === 0) {
        console.log('Nenhum anúncio ativo encontrado.');
        return;
    }
    console.log(`Total de ${allItemIds.length} anúncios encontrados. Buscando detalhes...`);

    const produtos = [];
    for (const id of allItemIds) {
        const detailUrl = `https://api.mercadolibre.com/items/${id}`;
        let detail;
        try {
            detail = await fetchJSON(detailUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        } catch (e) {
            console.error(`Erro ao buscar produto ${id}:`, e.message);
            continue;
        }
        if (!detail || !detail.id) continue;
        
        let description = detail.title;
        try {
            const descData = await fetchJSON(`https://api.mercadolibre.com/items/${id}/description`);
            if (descData && descData.plain_text) {
                description = descData.plain_text;
            }
        } catch (e) { /* Ignora erro se não houver descrição */ }

        // --- LÓGICA ATUALIZADA PARA BUSCAR DIMENSÕES E PESO ---
        const shippingInfo = detail.shipping || {};
        const dimensions = shippingInfo.dimensions || {}; // Ex: "30x20x10,800" (comprimento x largura x altura, peso em gramas)
        
        let peso_kg = 0.3; // Valor padrão
        let altura_cm = 10; // Valor padrão
        let largura_cm = 15; // Valor padrão
        let comprimento_cm = 20; // Valor padrão

        if (dimensions) {
            const parts = String(dimensions).split(',');
            if (parts.length === 2) {
                const dims = parts[0].split('x').map(Number);
                if (dims.length === 3) {
                    comprimento_cm = dims[0];
                    largura_cm = dims[1];
                    altura_cm = dims[2];
                }
                peso_kg = parseFloat(parts[1]) / 1000; // Converte gramas para kg
            }
        }
        // --- FIM DA LÓGICA DE DIMENSÕES ---

        produtos.push({
            id: detail.id,
            name: detail.title,
            description: description,
            categories: [detail.category_id],
            price: detail.price,
            images: detail.pictures.map(pic => pic.secure_url || pic.url),
            estoque: detail.available_quantity,
            // --- NOVOS CAMPOS ADICIONADOS ---
            peso_kg: peso_kg,
            altura_cm: altura_cm,
            largura_cm: largura_cm,
            comprimento_cm: comprimento_cm
        });
        console.log(`   - Detalhes do produto ${detail.id} (${detail.title}) obtidos.`);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(produtos, null, 2), 'utf8');
    console.log(`\nArquivo ${OUTPUT_FILE} gerado com sucesso, contendo ${produtos.length} produtos.`);
}

main().catch(err => {
    console.error('Ocorreu um erro fatal na execução:', err.message);
});