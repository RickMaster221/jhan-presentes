// js/categorias.js (Versão Final e Otimizada)

document.addEventListener('DOMContentLoaded', function() {
    const btnCategorias = document.getElementById('btn-categorias');
    const listaCategorias = document.getElementById('lista-categorias');

    // Carrega as categorias na lista suspensa
    btnCategorias.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (listaCategorias.style.display === 'block') {
            listaCategorias.style.display = 'none';
            return;
        }
        listaCategorias.innerHTML = '<span>Carregando...</span>';
        listaCategorias.style.display = 'block';

        // Busca as categorias diretamente da nova coleção (mais eficiente)
        const categorias = await getCategories();
        if (categorias.length === 0) {
            listaCategorias.innerHTML = '<span>Nenhuma categoria cadastrada.</span>';
            return;
        }
        
        // Cria checkboxes usando o ID da categoria como valor
        listaCategorias.innerHTML = categorias.map(cat =>
            `<label style='display:block; margin-bottom:6px; cursor:pointer;'>
               <input type='checkbox' class='category-filter-checkbox' value='${cat.id}'> ${cat.nome}
             </label>`
        ).join('') + `<br><button id='filtrar-categorias' class="btn-submit" style='margin-top:10px;'>Filtrar</button>`;
    });

    // Fecha a lista ao clicar fora
    document.addEventListener('click', function(e) {
        if (!listaCategorias.contains(e.target) && e.target !== btnCategorias) {
            listaCategorias.style.display = 'none';
        }
    });

    // Filtra os produtos ao clicar no botão
    document.addEventListener('click', async function(e) {
        if (e.target && e.target.id === 'filtrar-categorias') {
            const checks = listaCategorias.querySelectorAll('input[type=checkbox]:checked');
            const categoriasSelecionadasIds = Array.from(checks).map(c => c.value);
            listaCategorias.style.display = 'none';
            await filtrarProdutosPorCategoria(categoriasSelecionadasIds);
        }
    });
});

/**
 * Filtra e exibe os produtos com base nos IDs de categoria selecionados.
 * @param {string[]} selectedIds - Array de IDs de categoria para filtrar.
 */
async function filtrarProdutosPorCategoria(selectedIds) {
    let resultsContainer = document.getElementById('busca-resultados');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'busca-resultados';
        resultsContainer.style.padding = '20px';
        document.querySelector('main.conteudo-principal')?.insertAdjacentElement('afterend', resultsContainer);
    }

    if (!selectedIds || selectedIds.length === 0) {
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = '<h2>Resultados da Categoria</h2><p>Buscando produtos...</p>';
    const produtos = await getProducts();
    
    // Filtra produtos cujo array 'categoriaIds' contém algum dos IDs selecionados
    const filtrados = produtos.filter(p => {
        return p.categoriaIds && Array.isArray(p.categoriaIds) && p.categoriaIds.some(id => selectedIds.includes(id));
    });

    if (filtrados.length === 0) {
        resultsContainer.innerHTML = '<h2>Resultados da Categoria</h2><p>Nenhum produto encontrado para as categorias selecionadas.</p>';
        return;
    }
    
    let html = '<h2>Resultados da Categoria</h2><div class="produtos-grid">';
    filtrados.forEach(produto => {
        const isEsgotado = produto.estoque !== undefined && produto.estoque <= 0;
        const esgotadoBadge = isEsgotado ? '<div class="esgotado-badge">Esgotado</div>' : '';
        const img = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : 'https://via.placeholder.com/180';
        const cardAction = !isEsgotado ? `onclick="window.location.href='produtos.html?id=${produto.id}'"` : '';
        const cardStyle = !isEsgotado ? 'cursor:pointer;' : 'cursor:default; opacity:0.6;';

        html += `
            <div class='produto-card' style='${cardStyle}' ${cardAction}>
                ${esgotadoBadge}
                <img src='${img}' alt='${produto.nome}' style='width:100%; max-width:180px; height:180px; object-fit:contain; border-radius:6px; margin-bottom:10px;'>
                <h2 style='font-size:1.1em; margin:0 0 8px 0;'>${produto.nome}</h2>
                <span style='font-weight:bold; color:#d81b60;'>${(typeof produto.preco === 'number') ? `R$ ${produto.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</span>
            </div>
        `;
    });
    html += '</div>';
    resultsContainer.innerHTML = html;
}