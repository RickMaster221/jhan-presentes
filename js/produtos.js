// js/produtos.js

document.addEventListener('DOMContentLoaded', async function() {
    const productListContainer = document.getElementById('product-list');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const products = await getProducts(); 

    if (products.length === 0) {
        productListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
        return;
    }
    
    productListContainer.innerHTML = '';

    if (productId) {
        // --- PÁGINA DE DETALHES DO PRODUTO ---
        const product = products.find(p => p.id === productId);
        if (!product) {
            productListContainer.innerHTML = '<p>Produto não encontrado.</p>';
            return;
        }
        const imagens = (product.imagens && product.imagens.length > 0) ? product.imagens : ['https://via.placeholder.com/350'];
        let thumbsHtml = '';
        imagens.forEach((img) => {
            thumbsHtml += `<img src="${img}" class="thumb-img" alt="Miniatura" style="width:60px; height:60px; object-fit:cover; margin:2px; border:1px solid #ccc; border-radius:4px; cursor:pointer;">`;
        });

        productListContainer.innerHTML = `
            <a href="produtos.html" style="font-size:15px; display:block; margin-bottom: 20px;">&larr; Voltar à Página Inicial</a>
            <div style="display:flex; gap:40px; margin-top:20px; align-items:flex-start;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <img src="${imagens[0]}" class="main-img" alt="${product.nome}" style="width:320px; height:320px; object-fit:contain; border-radius:8px; box-shadow:0 2px 8px #0001; margin-bottom:10px;">
                    <div class="thumbs-row" style="display:flex; flex-wrap: wrap; justify-content: center;">${thumbsHtml}</div>
                </div>
                <div style="max-width:600px;">
                    <h2 style="margin-top:0;">${product.nome}</h2>
                    <p>${product.descricao || ''}</p>
                    <p><b>Preço:</b> ${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</p>
                    <div style="margin-top:20px;">
                        <label>Quantidade: <input type="number" id="quantidade-produto" min="1" value="1" style="width:50px;"></label>
                        <button id="add-to-cart-btn" style="margin-left:10px;">Adicionar ao Carrinho</button>
                        <p id="feedback-carrinho" style="color: green; font-weight: bold; margin-top: 10px;"></p>
                    </div>
                </div>
            </div>
        `;

        // Evento para trocar imagem principal
        document.querySelectorAll('.thumb-img').forEach(thumb => {
            thumb.addEventListener('click', function() {
                document.querySelector('.main-img').src = this.src;
            });
        });

        // --- LÓGICA PARA ADICIONAR AO CARRINHO ---
        document.getElementById('add-to-cart-btn').addEventListener('click', function() {
            const quantidade = parseInt(document.getElementById('quantidade-produto').value);
            // Pega o carrinho do localStorage ou cria um array vazio
            let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
            
            // Verifica se o produto já está no carrinho
            const itemExistente = carrinho.find(item => item.id === productId);

            if (itemExistente) {
                // Se já existe, apenas atualiza a quantidade
                itemExistente.quantidade += quantidade;
            } else {
                // Se não existe, adiciona o novo item
                carrinho.push({ id: productId, quantidade: quantidade });
            }

            // Salva o carrinho atualizado de volta no localStorage
            localStorage.setItem('carrinho', JSON.stringify(carrinho));
            
            // Dá um feedback para o usuário
            const feedbackEl = document.getElementById('feedback-carrinho');
            feedbackEl.textContent = 'Produto adicionado ao carrinho!';
            setTimeout(() => { feedbackEl.textContent = ''; }, 3000);
        });
        return;
    }

    // --- PÁGINA DE GRADE DE PRODUTOS ---
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'produto-card';
        productCard.style.cursor = 'pointer';
        const imagens = (product.imagens && product.imagens.length > 0) ? product.imagens : ['https://via.placeholder.com/180'];
        productCard.innerHTML = `
            <img src="${imagens[0]}" alt="${product.nome}" style="width:100%; max-width:180px; height:180px; object-fit:contain; border-radius:6px; margin-bottom:10px;">
            <h2 style="font-size:1.1em; margin:0 0 8px 0;">${product.nome}</h2>
            <span style="font-weight:bold; color:#d81b60;">${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível'}</span>
        `;
        productCard.addEventListener('click', function() {
            window.location.href = `produtos.html?id=${product.id}`;
        });
        productListContainer.appendChild(productCard);
    });
});