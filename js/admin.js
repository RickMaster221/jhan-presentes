// js/admin.js

// Função para exibir os produtos na tabela
async function displayProducts() {
    const products = await getProducts();
    const tableBody = document.getElementById('product-list-body');

    // Limpa a tabela antes de adicionar as novas linhas
    tableBody.innerHTML = '';

    products.forEach(product => {
        const row = tableBody.insertRow();
        
        // Colunas da tabela
        const cellImage = row.insertCell(0);
        const cellName = row.insertCell(1);
        const cellCategories = row.insertCell(2);
        const cellPrice = row.insertCell(3);
        const cellActions = row.insertCell(4);

        // Preenche as células com os dados do produto
        cellImage.innerHTML = `<img src="${product.images[0] || 'https://via.placeholder.com/60'}" alt="${product.name}" width="60">`;
        cellName.textContent = product.name;
        cellCategories.textContent = product.categories.join(', ');
        cellPrice.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
        
        // Adiciona botões de Ação (Editar/Excluir)
        cellActions.innerHTML = `
            <button class="btn-action">Editar</button>
            <button class="btn-action delete" onclick="removeProduct(${product.id})">Excluir</button>
        `;
    });
}

// Função para remover um produto
function removeProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        deleteProduct(productId); // Chama a função do database.js
        displayProducts(); // Atualiza a tabela na tela
    }
}

// Listener para o formulário de cadastro de produto
document.getElementById('product-form').addEventListener('submit', function(event) {
    event.preventDefault(); 
    
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const categories = document.getElementById('categories').value.split(',').map(cat => cat.trim());
    const price = parseFloat(document.getElementById('price').value);
    const images = document.getElementById('images').value.split(',').map(img => img.trim());

    const newProduct = { name, description, categories, price, images };

    addProduct(newProduct);

    // Limpa o formulário e dá um feedback
    this.reset();
    const feedback = document.getElementById('feedback-message');
    feedback.textContent = 'Produto cadastrado com sucesso!';
    feedback.style.color = 'green';
    setTimeout(() => { feedback.textContent = ''; }, 3000);

    // Atualiza a tabela para mostrar o novo produto
    displayProducts();
});

// Exibe os produtos na tabela assim que a página é carregada
window.addEventListener('load', displayProducts);