// js/admin.js (Versão Final com Múltiplas Categorias e TODOS os Filtros Restaurados)

/**
 * Popula um container com checkboxes para todas as categorias.
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
    
    container.innerHTML = '';
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
 * Cria dinamicamente os campos de filtro e ordenação e os insere na página.
 */
async function criarControlesDeFiltro() {
    const container = document.querySelector('.admin-container');
    const tableContainer = document.querySelector('.admin-table-container');
    if (document.getElementById('filtros-container')) return;

    const controlesDiv = document.createElement('div');
    controlesDiv.id = 'filtros-container';
    controlesDiv.style.cssText = `
        padding: 20px; border: 1px solid #eee; border-radius: 8px; 
        margin-bottom: 20px; display: flex; flex-wrap: wrap; 
        gap: 15px; align-items: flex-end;`;

    const categorias = await getCategories();
    let categoriasOptions = '<option value="">Todas as Categorias</option>';
    categorias.forEach(cat => {
        categoriasOptions += `<option value="${cat.id}">${cat.nome}</option>`;
    });

    controlesDiv.innerHTML = `
        <div style="flex:2; min-width:250px;">
            <label for="filtro-nome" style="display:block; margin-bottom:5px; font-weight:bold;">Pesquisar por Nome:</label>
            <input type="text" id="filtro-nome" placeholder="Digite o nome do produto..." style="width:100%; padding:8px; box-sizing: border-box;">
        </div>
        <div style="flex:1; min-width:200px;">
            <label for="filtro-categoria" style="display:block; margin-bottom:5px; font-weight:bold;">Filtrar por Categoria:</label>
            <select id="filtro-categoria" style="width:100%; padding:8px;">${categoriasOptions}</select>
        </div>
        <div style="flex:1; min-width:200px;">
            <label for="ordenar-por" style="display:block; margin-bottom:5px; font-weight:bold;">Ordenar por:</label>
            <select id="ordenar-por" style="width:100%; padding:8px;">
                <option value="nome-asc">Nome (A-Z)</option>
                <option value="nome-desc">Nome (Z-A)</option>
                <option value="preco-asc">Preço (Menor para Maior)</option>
                <option value="preco-desc">Preço (Maior para Menor)</option>
                <option value="estoque-asc">Estoque (Menor para Maior)</option>
                <option value="estoque-desc">Estoque (Maior para Menor)</option>
            </select>
        </div>
    `;

    container.insertBefore(controlesDiv, tableContainer);

    document.getElementById('filtro-nome').addEventListener('input', displayProducts);
    document.getElementById('filtro-categoria').addEventListener('change', displayProducts);
    document.getElementById('ordenar-por').addEventListener('change', displayProducts);
}


/**
 * Exibe os produtos na tabela, aplicando filtros e ordenação
 */
async function displayProducts() {
    let products = await getProducts();
    const categories = await getCategories();
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.nome]));
    const tableBody = document.getElementById('product-list-body');
    if (!tableBody) return;

    const filtroNome = document.getElementById('filtro-nome')?.value.toLowerCase() || '';
    const filtroCategoriaId = document.getElementById('filtro-categoria')?.value || '';
    const ordenarPor = document.getElementById('ordenar-por')?.value || 'nome-asc';

    if (filtroNome) {
        products = products.filter(p => p.nome && p.nome.toLowerCase().includes(filtroNome));
    }

    if (filtroCategoriaId) {
        products = products.filter(p => p.categoriaIds && p.categoriaIds.includes(filtroCategoriaId));
    }

    products.sort((a, b) => {
        switch (ordenarPor) {
            case 'nome-desc': return b.nome.localeCompare(a.nome);
            case 'preco-asc': return (a.preco || 0) - (b.preco || 0);
            case 'preco-desc': return (b.preco || 0) - (a.preco || 0);
            case 'estoque-asc': return (a.estoque || 0) - (b.estoque || 0);
            case 'estoque-desc': return (b.estoque || 0) - (a.estoque || 0);
            default: return a.nome.localeCompare(b.nome);
        }
    });

    tableBody.innerHTML = '';
    products.forEach(product => {
        const row = tableBody.insertRow();
        let categoryNames = 'Sem Categoria';
        if (product.categoriaIds && Array.isArray(product.categoriaIds) && product.categoriaIds.length > 0) {
            categoryNames = product.categoriaIds.map(id => categoryMap.get(id) || '').filter(Boolean).join(', ');
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

// O restante do seu código (modal de edição, cadastro, etc.)
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
    
    await populateCategoryCheckboxes('edit-category-list', product.categoriaIds || []);
    document.getElementById('edit-modal').style.display = 'flex';
}

window.removeProduct = async function(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        await deleteProduct(productId);
        displayProducts();
    }
}

document.addEventListener('DOMContentLoaded', () => {
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

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const selectedCategories = Array.from(document.querySelectorAll('#category-checkbox-list input:checked')).map(cb => cb.value);

            const newProduct = {
                nome: document.getElementById('name').value,
                descricao: document.getElementById('description').value,
                categoriaIds: selectedCategories,
                preco: parseFloat(document.getElementById('price').value),
                estoque: parseInt(document.getElementById('stock').value, 10),
                imagens: document.getElementById('images').value.split(',').map(i => i.trim())
            };

            await addProduct(newProduct);
            productForm.reset();
            await populateCategoryCheckboxes('category-checkbox-list');
            
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
                preco: parseFloat(document.getElementById('price').value),
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
    criarControlesDeFiltro();
    populateCategoryCheckboxes('category-checkbox-list');
    displayProducts();
});