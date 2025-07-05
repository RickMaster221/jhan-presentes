// js/busca.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.search-bar form');
    const input = form.querySelector('input[name="busca"]');
    let resultsContainer = document.getElementById('busca-resultados');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'busca-resultados';
        resultsContainer.style.margin = '40px auto 0 auto';
        resultsContainer.style.maxWidth = '1100px';
        document.body.appendChild(resultsContainer);
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const termo = input.value.trim().toLowerCase();
        if (!termo) {
            resultsContainer.innerHTML = '';
            return;
        }
        resultsContainer.innerHTML = '<p>Buscando...</p>';
        const produtos = await getProducts();
        const filtrados = produtos.filter(p =>
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.descricao && p.descricao.toLowerCase().includes(termo))
        );
        if (filtrados.length === 0) {
            resultsContainer.innerHTML = '<p>Nenhum produto encontrado.</p>';
            return;
        }
        let html = '<div class="produtos-grid">';
        filtrados.forEach(produto => {
            const img = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : 'https://via.placeholder.com/180';
            html += `<div class='produto-card' style='cursor:pointer;' onclick="window.location.href='produtos.html?id=${produto.id}'">
                <img src='${img}' alt='${produto.nome}' style='width:100%; max-width:180px; height:180px; object-fit:contain; border-radius:6px; margin-bottom:10px;'>
                <h2 style='font-size:1.1em; margin:0 0 8px 0;'>${produto.nome}</h2>
                <span style='font-weight:bold; color:#d81b60;'>${(typeof produto.preco === 'number') ? `R$ ${produto.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</span>
            </div>`;
        });
        html += '</div>';
        resultsContainer.innerHTML = html;
    });
});
