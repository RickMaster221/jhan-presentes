// js/busca.js

/**
 * Esta função realiza a busca e exibe os resultados no container apropriado.
 * @param {string} termo - O texto a ser buscado.
 */
async function performSearch(termo) {
    // Encontra o container onde os resultados serão exibidos
    let resultsContainer = document.getElementById('busca-resultados');
    
    // Se o container não existir na página atual, não faz nada
    if (!resultsContainer) {
        console.log('Container #busca-resultados não encontrado nesta página.');
        return;
    }

    if (!termo) {
        resultsContainer.innerHTML = ''; // Limpa os resultados se a busca for vazia
        return;
    }

    resultsContainer.innerHTML = '<p>Buscando...</p>';
    const produtos = await getProducts(); // Função de database.js
    const termoLower = termo.toLowerCase();

    // Filtra os produtos
    const filtrados = produtos.filter(p =>
        (p.nome && p.nome.toLowerCase().includes(termoLower)) ||
        (p.descricao && p.descricao.toLowerCase().includes(termoLower))
    );

    if (filtrados.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum produto encontrado para "' + termo + '".</p>';
        return;
    }

    // Monta o HTML para os produtos encontrados
    let html = '<h2>Resultados da Busca</h2><div class="produtos-grid">';
    filtrados.forEach(produto => {
        const img = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : 'https://via.placeholder.com/180';
        html += `
            <div class='produto-card' style='cursor:pointer;' onclick="window.location.href='produtos.html?id=${produto.id}'">
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

    // Verifica se a página foi carregada com um termo de busca na URL
    const urlParams = new URLSearchParams(window.location.search);
    const buscaParam = urlParams.get('busca');

    // Se houver um termo de busca na URL, executa a busca automaticamente
    if (buscaParam) {
        input.value = buscaParam; // Preenche o campo de busca
        performSearch(buscaParam);
    }

    // Adiciona o evento de 'submit' ao formulário de busca
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const termo = input.value.trim();
        
        // Verifica se a página atual é a index.html
        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        if (isIndexPage) {
            // Se já estiver na página inicial, apenas executa a busca
            performSearch(termo);
        } else {
            // Se estiver em outra página, redireciona para a index com o termo da busca
            window.location.href = `index.html?busca=${encodeURIComponent(termo)}`;
        }
    });
});