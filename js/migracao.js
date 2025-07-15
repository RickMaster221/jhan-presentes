// js/migracao.js (Versão Corrigida e Robusta)

document.getElementById('start-migration').addEventListener('click', async () => {
    const logDiv = document.getElementById('log');
    const startButton = document.getElementById('start-migration');
    
    startButton.disabled = true;
    logDiv.innerHTML = 'Iniciando migração...<br>';

    try {
        logDiv.innerHTML += 'Buscando categorias cadastradas...<br>';
        const categories = await getCategories();
        // Mapa de NOME da categoria (em minúsculas) para o ID dela
        const categoryMap = new Map(categories.map(cat => [cat.nome.toLowerCase().trim(), cat.id]));
        logDiv.innerHTML += `${categories.length} categorias encontradas no sistema.<br><br>`;

        logDiv.innerHTML += 'Buscando todos os produtos...<br>';
        const products = await getProducts();
        logDiv.innerHTML += `${products.length} produtos encontrados.<br><br>`;

        let produtosAtualizados = 0;

        for (const product of products) {
            // A condição para migrar: o produto TEM o campo antigo 'categorias' e NÃO TEM o novo 'categoriaIds'
            if (product.categorias && !product.categoriaIds) {
                logDiv.innerHTML += `Analisando produto: "${product.nome}"...<br>`;
                
                const nomesCategoriasAntigas = product.categorias;
                const novosIdsDeCategoria = [];

                nomesCategoriasAntigas.forEach(nomeCat => {
                    const idEncontrado = categoryMap.get(nomeCat.toLowerCase().trim());
                    if (idEncontrado) {
                        novosIdsDeCategoria.push(idEncontrado);
                    } else {
                        logDiv.innerHTML += `<span style="color: orange;"> -> Atenção: A categoria "${nomeCat}" não foi encontrada no sistema.</span><br>`;
                    }
                });

                if (novosIdsDeCategoria.length > 0) {
                    const productRef = db.collection('produtos').doc(product.id);
                    await productRef.update({
                        categoriaIds: novosIdsDeCategoria // Adiciona o novo campo com a LISTA de IDs
                    });
                    logDiv.innerHTML += `<span style="color: green;"> -> Sucesso! Produto migrado para o novo sistema de categorias.</span><br>`;
                    produtosAtualizados++;
                } else {
                     logDiv.innerHTML += ` -> Nenhuma categoria correspondente encontrada para este produto.<br>`;
                }
            }
        }

        logDiv.innerHTML += `<br><hr><strong>Migração Concluída!</strong><br>`;
        logDiv.innerHTML += `<strong style="color: green;">${produtosAtualizados} produtos foram atualizados.</strong><br>`;

    } catch (error) {
        console.error("Erro durante a migração:", error);
        logDiv.innerHTML += `<br><strong style="color: red;">Ocorreu um erro: ${error.message}</strong>`;
    } finally {
        startButton.disabled = false;
    }
});