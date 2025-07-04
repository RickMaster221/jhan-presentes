const https = require('https');
const fs = require('fs');

// --- COLOQUE SEU ACCESS TOKEN AQUI ---
// Este token é a chave que prova que você tem permissão.
// Cole o seu access_token aqui
const ACCESS_TOKEN = 'APP_USR-61378233694878-070408-a3eba63cc31126fba97a1a13fd909c9f-1309839841'; 

const OUTPUT_FILE = 'produtos-ml.json';

function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    // 1. Obter o ID do usuário autenticado (o seu próprio ID)
    // A API '/users/me' retorna os dados do dono do token.
    const userMeUrl = 'https://api.mercadolibre.com/users/me';
    const userMeData = await fetchJSON(userMeUrl, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const userId = userMeData.id;

    if (!userId) {
        console.log('Não foi possível obter o ID do usuário. Verifique seu Access Token.');
        return;
    }
    console.log(`ID do Vendedor encontrado: ${userId}`);

    // 2. Buscar os IDs de todos os anúncios ativos do usuário
    const itemListUrl = `https://api.mercadolibre.com/users/${userId}/items/search?status=active`;
    const itemListData = await fetchJSON(itemListUrl, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const itemIds = itemListData.results;

    if (!itemIds || itemIds.length === 0) {
        console.log('Nenhum anúncio ativo encontrado.');
        return;
    }
    console.log(`Encontrados ${itemIds.length} anúncios. Buscando detalhes...`);

    // 3. Buscar detalhes de cada anúncio individualmente, autenticado
    const produtos = [];
    for (const id of itemIds) {
        const detailUrl = `https://api.mercadolibre.com/items/${id}`;
        let detail;
        try {
            detail = await fetchJSON(detailUrl, {
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
            });
        } catch (e) {
            console.error(`Erro ao buscar produto ${id}:`, e.message);
            continue;
        }
        if (!detail || !detail.id) continue;
        produtos.push({
            id: detail.id,
            name: detail.title,
            description: detail.subtitle || detail.title,
            categories: [detail.category_id],
            price: detail.price,
            images: detail.pictures.map(pic => pic.secure_url || pic.url)
        });
    }

    // 4. Salvar o JSON no formato do site
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(produtos, null, 2), 'utf8');
    console.log(`Arquivo ${OUTPUT_FILE} gerado com ${produtos.length} produtos.`);
}

main().catch(err => {
    console.error('Erro ao buscar produtos:', err.message);
});