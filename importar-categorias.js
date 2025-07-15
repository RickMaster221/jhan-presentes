// importar-categorias.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carrega sua chave de serviço do Firebase
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const produtosFilePath = path.join(__dirname, 'produtos-ml.json');

async function importarCategoriasUnicas() {
    console.log("Iniciando a importação de categorias...");

    // 1. Ler o arquivo de produtos
    if (!fs.existsSync(produtosFilePath)) {
        console.error("Erro: O arquivo 'produtos-ml.json' não foi encontrado. Execute o script de importação de produtos primeiro.");
        return;
    }
    const produtos = JSON.parse(fs.readFileSync(produtosFilePath, 'utf8'));
    console.log(`Encontrados ${produtos.length} produtos no arquivo.`);

    // 2. Extrair todas as categorias únicas usando um Set para evitar duplicatas
    const categoriasUnicas = new Set();
    produtos.forEach(produto => {
        // O campo 'categories' no seu JSON é um array, pegamos o primeiro item
        if (produto.categories && Array.isArray(produto.categories) && produto.categories.length > 0) {
            // Adiciona o nome da categoria ao Set. O Set cuida das duplicatas.
            // Usamos trim() para remover espaços em branco acidentais.
            categoriasUnicas.add(produto.categories[0].trim());
        }
    });

    if (categoriasUnicas.size === 0) {
        console.log("Nenhuma categoria encontrada nos produtos para importar.");
        return;
    }

    console.log(`\nEncontradas ${categoriasUnicas.size} categorias únicas para importar:`);
    console.log(Array.from(categoriasUnicas).join(', '));

    // 3. Salvar cada categoria única no Firestore
    console.log("\nIniciando cadastro no Firebase...");
    const categoriasCollection = db.collection('categorias');
    let categoriasAdicionadas = 0;

    for (const nomeCategoria of categoriasUnicas) {
        try {
            // Adiciona um novo documento com o nome da categoria
            await categoriasCollection.add({
                nome: nomeCategoria
            });
            console.log(` -> Categoria "${nomeCategoria}" cadastrada com sucesso.`);
            categoriasAdicionadas++;
        } catch (e) {
            console.error(`Erro ao cadastrar a categoria "${nomeCategoria}":`, e.message);
        }
    }

    console.log(`\nImportação finalizada! ${categoriasAdicionadas} categorias foram adicionadas ao Firebase.`);
}

importarCategoriasUnicas();