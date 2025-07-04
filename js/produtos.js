// js/produtos.js

document.addEventListener('DOMContentLoaded', async function() {
    const productListContainer = document.getElementById('product-list');
    const products = await getProducts(); // Pega os produtos do "banco de dados"

    if (products.length === 0) {
        productListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
        return;
    }

    // Limpa o container antes de adicionar os produtos
    productListContainer.innerHTML = '';

    // Cria um card HTML para cada produto e o insere na página
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'produto-card'; // Para estilização com CSS

        productCard.innerHTML = `
            <img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%;">
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <span>R$ ${product.price.toFixed(2).replace('.', ',')}</span>
            <br><br>
            <button>Adicionar ao Carrinho</button>
        `;

        productListContainer.appendChild(productCard);
    });
});