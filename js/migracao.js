// js/migracao.js

document.getElementById('start-migration').addEventListener('click', async () => {
    const logDiv = document.getElementById('log');
    const startButton = document.getElementById('start-migration');
    
    startButton.disabled = true;
    logDiv.innerHTML = 'Iniciando migração...<br>';

    try {
        // 1. Buscar todas as categorias e criar um mapa de "nome" para "ID"
        logDiv.innerHTML += 'Buscando categorias cadastradas...<br>';
        const categories = await getCategories();
        const categoryMap = new Map(categories.map(cat => [cat.nome.toLowerCase(), cat.id]));
        logDiv.innerHTML += `${categories.length} categorias encontradas.<br><br>`;

        // 2. Buscar todos os produtos
        logDiv.innerHTML += 'Buscando todos os produtos...<br>';
        const products = await getProducts();
        logDiv.innerHTML += `${products.length} produtos encontrados.<br><br>`;

        let produtosAtualizados = 0;

        // 3. Iterar sobre cada produto para verificar se precisa de migração
        for (const product of products) {
            // Verifica se o produto NÃO tem o novo campo 'categoriaId'
            // E se ele TEM o campo antigo 'categorias' (que é um array de strings)
            if (!product.categoriaId && product.categorias && Array.isArray(product.categorias) && product.categorias.length > 0) {
                
                const nomeCategoriaAntiga = product.categorias[0]; // Pega o primeiro nome de categoria do array antigo
                const idCategoriaNova = categoryMap.get(nomeCategoriaAntiga.toLowerCase());

                if (idCategoriaNova) {
                    // Encontrou uma correspondência! Vamos atualizar o produto.
                    logDiv.innerHTML += `Migrando produto: "${product.nome}"...<br>`;
                    
                    const productRef = db.collection('produtos').doc(product.id);
                    await productRef.update({
                        categoriaId: idCategoriaNova // Adiciona o novo campo
                    });

                    logDiv.innerHTML += `<span style="color: green;"> -> Sucesso! Categoria "${nomeCategoriaAntiga}" associada.</span><br>`;
                    produtosAtualizados++;
                } else {
                    logDiv.innerHTML += `<span style="color: orange;"> -> Atenção: Produto "${product.nome}" tem a categoria "${nomeCategoriaAntiga}", que não foi encontrada no novo sistema. Pulei.</span><br>`;
                }
            }
        }

        logDiv.innerHTML += `<br><hr><strong>Migração Concluída!</strong><br>`;
        logDiv.innerHTML += `<strong style="color: green;">${produtosAtualizados} produtos foram atualizados com sucesso.</strong><br>`;

    } catch (error) {
        console.error("Erro durante a migração:", error);
        logDiv.innerHTML += `<br><strong style="color: red;">Ocorreu um erro: ${error.message}</strong>`;
    } finally {
        startButton.disabled = false;
    }
});