// js/busca.js (Atualizado com a lógica de "Esgotado")

/**
 * Esta função realiza a busca e exibe os resultados no container apropriado.
 * @param {string} termo - O texto a ser buscado.
 */
async function performSearch(termo) {
    let resultsContainer = document.getElementById('busca-resultados');
    
    if (!resultsContainer) {
        // Cria o container se ele não existir na página (para busca vinda de outras páginas)
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'busca-resultados';
        resultsContainer.style.margin = '40px auto 0 auto';
        resultsContainer.style.maxWidth = '1100px';
        // Encontra o elemento 'main' e insere o container de resultados depois dele
        const mainContent = document.querySelector('main.conteudo-principal');
        if (mainContent) {
            mainContent.insertAdjacentElement('afterend', resultsContainer);
        } else {
            document.body.appendChild(resultsContainer);
        }
    }

    if (!termo) {
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = '<p>Buscando...</p>';
    const produtos = await getProducts();
    const termoLower = termo.toLowerCase();

    const filtrados = produtos.filter(p =>
        (p.nome && p.nome.toLowerCase().includes(termoLower)) ||
        (p.descricao && p.descricao.toLowerCase().includes(termoLower))
    );

    if (filtrados.length === 0) {
        resultsContainer.innerHTML = '<h2>Resultados da Busca</h2><p>Nenhum produto encontrado para "' + termo + '".</p>';
        return;
    }

    let html = '<h2>Resultados da Busca</h2><div class="produtos-grid">';
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


// --- LÓGICA PRINCIPAL DO SCRIPT ---
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.search-bar form');
    const input = form.querySelector('input[name="busca"]');

    const urlParams = new URLSearchParams(window.location.search);
    const buscaParam = urlParams.get('busca');

    if (buscaParam) {
        input.value = buscaParam;
        performSearch(buscaParam);
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const termo = input.value.trim();
        
        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        if (isIndexPage) {
            performSearch(termo);
        } else {
            window.location.href = `index.html?busca=${encodeURIComponent(termo)}`;
        }
    });
});