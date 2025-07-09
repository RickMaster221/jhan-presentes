// js/categorias.js (Atualizado com a lógica de "Esgotado")

document.addEventListener('DOMContentLoaded', function() {
    const btnCategorias = document.getElementById('btn-categorias');
    const listaCategorias = document.getElementById('lista-categorias');
    let categoriasSelecionadas = [];

    btnCategorias.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (listaCategorias.style.display === 'block') {
            listaCategorias.style.display = 'none';
            return;
        }
        listaCategorias.innerHTML = '<span>Carregando categorias...</span>';
        listaCategorias.style.display = 'block';
        const produtos = await getProducts();
        // Extrai categorias únicas
        const todasCategorias = new Set();
        produtos.forEach(p => {
            if (Array.isArray(p.categorias)) {
                p.categorias.forEach(cat => todasCategorias.add(cat));
            } else if (typeof p.categoria === 'string') {
                todasCategorias.add(p.categoria);
            }
        });
        const arrCategorias = Array.from(todasCategorias);
        if (arrCategorias.length === 0) {
            listaCategorias.innerHTML = '<span>Nenhuma categoria cadastrada.</span>';
            return;
        }
        listaCategorias.innerHTML = arrCategorias.map(cat =>
            `<label style='display:block; margin-bottom:6px; cursor:pointer;'><input type='checkbox' value='${cat}'> ${cat}</label>`
        ).join('') + `<br><button id='filtrar-categorias' style='margin-top:10px;'>Filtrar</button>`;
    });

    // Fecha lista ao clicar fora
    document.addEventListener('click', function(e) {
        if (!listaCategorias.contains(e.target) && e.target !== btnCategorias) {
            listaCategorias.style.display = 'none';
        }
    });

    // Filtrar produtos ao clicar no botão
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'filtrar-categorias') {
            const checks = listaCategorias.querySelectorAll('input[type=checkbox]:checked');
            categoriasSelecionadas = Array.from(checks).map(c => c.value);
            listaCategorias.style.display = 'none';
            filtrarProdutosPorCategoria(categoriasSelecionadas);
        }
    });
});

// Função para filtrar produtos na tela inicial (ATUALIZADA)
async function filtrarProdutosPorCategoria(categorias) {
    let resultsContainer = document.getElementById('busca-resultados');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'busca-resultados';
        const mainContent = document.querySelector('main.conteudo-principal');
        if (mainContent) {
            mainContent.insertAdjacentElement('afterend', resultsContainer);
        } else {
            document.body.appendChild(resultsContainer);
        }
    }
    if (!categorias || categorias.length === 0) {
        resultsContainer.innerHTML = '';
        return;
    }
    const produtos = await getProducts();
    const filtrados = produtos.filter(p => {
        if (Array.isArray(p.categorias)) {
            return p.categorias.some(cat => categorias.includes(cat));
        } else if (typeof p.categoria === 'string') {
            return categorias.includes(p.categoria);
        }
        return false;
    });

    if (filtrados.length === 0) {
        resultsContainer.innerHTML = '<h2>Resultados da Categoria</h2><p>Nenhum produto encontrado para as categorias selecionadas.</p>';
        return;
    }
    
    let html = '<h2>Resultados da Categoria</h2><div class="produtos-grid">';
    filtrados.forEach(produto => {
        // --- LÓGICA DA TARJA DE ESGOTADO ADICIONADA AQUI ---
        let esgotadoBadge = '';
        if (produto.estoque !== undefined && produto.estoque <= 0) {
            esgotadoBadge = '<div class="esgotado-badge">Esgotado</div>';
        }

        const img = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : 'https://via.placeholder.com/180';
        
        let cardStyle = 'cursor:pointer;';
        let onClickAction = `onclick="window.location.href='produtos.html?id=${produto.id}'"`;

        if (produto.estoque !== undefined && produto.estoque <= 0) {
            cardStyle = 'cursor:default; opacity:0.6;';
            onClickAction = ''; // Remove a ação de clique
        }

        html += `
            <div class='produto-card' style='${cardStyle}' ${onClickAction}>
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