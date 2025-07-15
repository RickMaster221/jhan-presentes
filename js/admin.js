// js/admin.js (Versão Final para Múltiplas Categorias)

/**
 * Popula um container com checkboxes para todas as categorias.
 * @param {string} containerId - O ID do elemento div que conterá os checkboxes.
 * @param {string[]} [selectedCategoryIds=[]] - Um array com os IDs das categorias que devem vir pré-selecionadas.
 */
async function populateCategoryCheckboxes(containerId, selectedCategoryIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = 'Carregando categorias...';
    const categories = await getCategories();

    if (categories.length === 0) {
        container.innerHTML = '<p>Nenhuma categoria cadastrada. <a href="categorias.html">Cadastre uma aqui</a>.</p>';
        return;
    }
    
    container.innerHTML = ''; // Limpa antes de adicionar
    categories.forEach(cat => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'product_categories';
        checkbox.value = cat.id;

        if (selectedCategoryIds.includes(cat.id)) {
            checkbox.checked = true;
        }

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${cat.nome}`));
        container.appendChild(label);
    });
}


/**
 * Exibe os produtos na tabela.
 */
async function displayProducts() {
    const products = await getProducts();
    const categories = await getCategories();
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.nome]));
    const tableBody = document.getElementById('product-list-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    products.forEach(product => {
        const row = tableBody.insertRow();
        let categoryNames = 'Sem Categoria';
        
        // Verifica se o produto tem o campo 'categoriaIds' e se é um array
        if (product.categoriaIds && Array.isArray(product.categoriaIds)) {
            categoryNames = product.categoriaIds
                .map(id => categoryMap.get(id) || 'Desconhecida')
                .join(', ');
        } else if (product.categoriaId) { // Fallback para o sistema antigo
            categoryNames = categoryMap.get(product.categoriaId) || 'Sem Categoria';
        }

        row.innerHTML = `
            <td><img src="${(product.imagens && product.imagens.length > 0) ? product.imagens[0] : 'https://via.placeholder.com/60'}" alt="Imagem" width="60"></td>
            <td>${product.nome || '-'}</td>
            <td>${categoryNames}</td>
            <td>${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : '-'}</td>
            <td>${product.estoque !== undefined ? product.estoque : '-'}</td>
            <td>
                <button class="btn-action" onclick="editProduct('${product.id}')">Editar</button>
                <button class="btn-action delete" onclick="removeProduct('${product.id}')">Excluir</button>
            </td>
        `;
    });
}

/**
 * Abre o modal de edição para um produto.
 * @param {string} productId - O ID do produto a ser editado.
 */
window.editProduct = async function(productId) {
    const products = await getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return alert('Produto não encontrado!');
    
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.nome || '';
    document.getElementById('edit-description').value = product.descricao || '';
    document.getElementById('edit-price').value = product.preco || '';
    document.getElementById('edit-stock').value = product.estoque !== undefined ? product.estoque : ''; 
    document.getElementById('edit-images').value = (product.imagens && product.imagens.length > 0) ? product.imagens.join(', ') : '';
    
    // Popula os checkboxes e marca os que já estão associados ao produto
    await populateCategoryCheckboxes('edit-category-list', product.categoriaIds || []);
    
    document.getElementById('edit-modal').style.display = 'flex';
}

/**
 * Deleta um produto.
 * @param {string} productId - O ID do produto a ser deletado.
 */
window.removeProduct = async function(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        await deleteProduct(productId);
        displayProducts();
    }
}

// --- Funções que rodam quando a página carrega ---
document.addEventListener('DOMContentLoaded', () => {

    // Cria o HTML do Modal de Edição dinamicamente (para evitar repetição)
    const modalHtml = `
    <div id="edit-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#fff; padding:30px; border-radius:8px; min-width:400px; max-width:90vw; position:relative;">
        <h2>Editar Produto</h2>
        <form id="edit-product-form">
          <input type="hidden" id="edit-id">
          <div class="form-row"><label>Nome:</label><input type="text" id="edit-name" required></div>
          <div class="form-row"><label>Descrição:</label><textarea id="edit-description" required></textarea></div>
          <div class="form-row"><label>Categorias:</label><div id="edit-category-list" class="category-checkbox-list"></div></div>
          <div class="form-row"><label>Preço (R$):</label><input type="number" id="edit-price" step="0.01" required></div>
          <div class="form-row"><label>Estoque:</label><input type="number" id="edit-stock" required></div>
          <div class="form-row"><label>Imagens (URLs):</label><input type="text" id="edit-images"></div>
          <div style="margin-top:15px; text-align:right;">
            <button type="button" id="close-modal" style="margin-right:10px;">Cancelar</button>
            <button type="submit" class="btn-submit">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Adiciona os listeners aos formulários e botões
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const selectedCategories = Array.from(document.querySelectorAll('#category-checkbox-list input:checked')).map(cb => cb.value);

            const newProduct = {
                nome: document.getElementById('name').value,
                descricao: document.getElementById('description').value,
                categoriaIds: selectedCategories, // Salva o array de IDs
                preco: parseFloat(document.getElementById('price').value),
                estoque: parseInt(document.getElementById('stock').value, 10),
                imagens: document.getElementById('images').value.split(',').map(i => i.trim())
            };

            await addProduct(newProduct);
            productForm.reset();
            await populateCategoryCheckboxes('category-checkbox-list'); // Recarrega checkboxes limpos
            
            const feedback = document.getElementById('feedback-message');
            feedback.textContent = 'Produto cadastrado com sucesso!';
            feedback.style.color = 'green';
            setTimeout(() => { feedback.textContent = ''; }, 3000);
            
            await displayProducts();
        });
    }

    const editForm = document.getElementById('edit-product-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const selectedCategories = Array.from(document.querySelectorAll('#edit-category-list input:checked')).map(cb => cb.value);

            const updatedData = {
                nome: document.getElementById('edit-name').value,
                descricao: document.getElementById('edit-description').value,
                categoriaIds: selectedCategories,
                preco: parseFloat(document.getElementById('edit-price').value),
                estoque: parseInt(document.getElementById('edit-stock').value, 10),
                imagens: document.getElementById('edit-images').value.split(',').map(i => i.trim())
            };
          
            await db.collection('produtos').doc(id).update(updatedData);
          
            document.getElementById('edit-modal').style.display = 'none';
            await displayProducts();
        });
    }

    const closeModalButton = document.getElementById('close-modal');
    if (closeModalButton) {
        closeModalButton.onclick = () => {
            document.getElementById('edit-modal').style.display = 'none';
        };
    }

    // Carrega tudo ao iniciar a página
    populateCategoryCheckboxes('category-checkbox-list');
    displayProducts();
});