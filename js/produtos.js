// js/produtos.js (Versão Final e Completa)

document.addEventListener('DOMContentLoaded', async function() {
    const productListContainer = document.getElementById('product-list');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // --- LÓGICA PARA A PÁGINA DE DETALHES DE UM PRODUTO ---
        const products = await getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            productListContainer.innerHTML = '<p>Produto não encontrado.</p>';
            return;
        }

        const isEsgotado = product.estoque !== undefined && product.estoque <= 0;
        const imagens = (product.imagens && product.imagens.length > 0) ? product.imagens : ['https://via.placeholder.com/350'];
        
        // Busca os nomes das categorias para exibir
        const allCategories = await getCategories();
        const categoryMap = new Map(allCategories.map(cat => [cat.id, cat.nome]));
        let categoryNames = '';
        if (product.categoriaIds && product.categoriaIds.length > 0) {
            categoryNames = product.categoriaIds.map(id => categoryMap.get(id)).filter(Boolean).join(', ');
        }

        productListContainer.innerHTML = `
            <a href="produtos.html" style="font-size:15px; display:block; margin-bottom: 20px;">&larr; Voltar para todos os produtos</a>
            <div class="product-detail-container" style="display:flex; gap:40px; margin-top:20px; align-items:flex-start;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <img src="${imagens[0]}" class="main-img" alt="${product.nome}" style="width:320px; height:320px; object-fit:contain; border-radius:8px; box-shadow:0 2px 8px #0001; margin-bottom:10px;">
                </div>
                <div style="max-width:600px;">
                    <h2 style="margin-top:0;">${product.nome}</h2>
                    ${categoryNames ? `<p style="font-size:0.9em; color:#666;">Categorias: ${categoryNames}</p>` : ''}
                    <p>${product.descricao || ''}</p>
                    <p><b>Preço:</b> ${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</p>
                    <p><b>Em estoque:</b> ${product.estoque !== undefined ? product.estoque : 'Consulte'}</p>
                    <div style="margin-top:20px;">
                        <label>Quantidade: <input type="number" id="quantidade-produto" min="1" value="1" style="width:50px;" ${isEsgotado ? 'disabled' : ''}></label>
                        <button id="add-to-cart-btn" class="btn-submit" style="margin-left:10px;" ${isEsgotado ? 'disabled' : ''}>
                            ${isEsgotado ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
                        </button>
                        <p id="feedback-carrinho" style="color: green; font-weight: bold; margin-top: 10px;"></p>
                    </div>
                </div>
            </div>
        `;

        // Adiciona o evento de clique ao botão 'Adicionar ao Carrinho'
        if (!isEsgotado) {
            document.getElementById('add-to-cart-btn').addEventListener('click', function() {
                const quantidade = parseInt(document.getElementById('quantidade-produto').value);
                let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
                const itemExistente = carrinho.find(item => item.id === productId);

                if (itemExistente) {
                    itemExistente.quantidade += quantidade;
                } else {
                    carrinho.push({ id: productId, quantidade: quantidade });
                }

                localStorage.setItem('carrinho', JSON.stringify(carrinho));
                
                const feedbackEl = document.getElementById('feedback-carrinho');
                feedbackEl.textContent = 'Produto adicionado ao carrinho!';
                setTimeout(() => { feedbackEl.textContent = ''; }, 3000);
            });
        }
        return; // Encerra a execução aqui para não mostrar a grade de produtos
    }

    // --- LÓGICA PARA A PÁGINA DE GRADE DE PRODUTOS ---
    const products = await getProducts();
    if (products.length === 0) {
        productListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
        return;
    }
    
    productListContainer.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'produto-card';
        
        const isEsgotado = product.estoque !== undefined && product.estoque <= 0;
        const esgotadoBadge = isEsgotado ? '<div class="esgotado-badge">Esgotado</div>' : '';
        if (isEsgotado) {
            productCard.style.cursor = 'default';
            productCard.style.opacity = '0.6';
        } else {
            productCard.style.cursor = 'pointer';
            productCard.addEventListener('click', () => {
                window.location.href = `produtos.html?id=${product.id}`;
            });
        }

        const imagem = (product.imagens && product.imagens.length > 0) ? product.imagens[0] : 'https://via.placeholder.com/180';
        
        productCard.innerHTML = `
            ${esgotadoBadge}
            <img src="${imagem}" alt="${product.nome}" style="width:100%; max-width:180px; height:180px; object-fit:contain; border-radius:6px; margin-bottom:10px;">
            <h2 style="font-size:1.1em; margin:0 0 8px 0;">${product.nome}</h2>
            <span style="font-weight:bold; color:#d81b60;">${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</span>
        `;
        
        productListContainer.appendChild(productCard);
    });
});