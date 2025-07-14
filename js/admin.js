// js/admin.js (Refatorado para usar a coleção de categorias)

/**
 * Popula o menu de categorias no formulário de produtos.
 */
async function populateCategoryDropdown(selectElementId, selectedCategoryId = null) {
    const select = document.getElementById(selectElementId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    const categories = await getCategories();
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id; // Salva o ID da categoria
        option.textContent = cat.nome; // Mostra o nome da categoria
        if (cat.id === selectedCategoryId) {
            option.selected = true;
        }
        select.appendChild(option);
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
    controlesDiv.style.padding = '20px';
    controlesDiv.style.border = '1px solid #eee';
    controlesDiv.style.borderRadius = '8px';
    controlesDiv.style.marginBottom = '20px';
    controlesDiv.style.display = 'flex';
    controlesDiv.style.flexWrap = 'wrap';
    controlesDiv.style.gap = '15px';
    controlesDiv.style.alignItems = 'flex-end';

    const categorias = await getCategories();
    let categoriasOptions = '<option value="">Todas as Categorias</option>';
    categorias.forEach(cat => {
        // Filtra pelo nome da categoria, que é uma string
        categoriasOptions += `<option value="${cat.nome}">${cat.nome}</option>`;
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

    document.getElementById('filtro-nome').addEventListener('input', () => displayProducts());
    document.getElementById('filtro-categoria').addEventListener('change', () => displayProducts());
    document.getElementById('ordenar-por').addEventListener('change', () => displayProducts());
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
    const filtroCategoria = document.getElementById('filtro-categoria')?.value || '';
    const ordenarPor = document.getElementById('ordenar-por')?.value || 'nome-asc';

    if (filtroNome) {
        products = products.filter(p => p.nome && p.nome.toLowerCase().includes(filtroNome));
    }
    
    // Filtra pelo nome da categoria
    if (filtroCategoria) {
        products = products.filter(p => {
            const categoryName = categoryMap.get(p.categoriaId);
            return categoryName === filtroCategoria;
        });
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
        const categoryName = categoryMap.get(product.categoriaId) || 'Sem Categoria';

        row.innerHTML = `
            <td><img src="${(product.imagens && product.imagens.length > 0) ? product.imagens[0] : 'https://via.placeholder.com/60'}" alt="Imagem" width="60"></td>
            <td>${product.nome || '-'}</td>
            <td>${categoryName}</td>
            <td>${(typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : '-'}</td>
            <td>${product.estoque !== undefined ? product.estoque : '-'}</td>
            <td>
                <button class="btn-action" onclick="editProduct('${product.id}')">Editar</button>
                <button class="btn-action delete" onclick="removeProduct('${product.id}')">Excluir</button>
            </td>
        `;
    });
}

function removeProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        deleteProduct(productId);
        displayProducts();
    }
}

// Modal de edição
const modalHtml = `
<div id="edit-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:9999; justify-content:center; align-items:center;">
  <div style="background:#fff; padding:30px; border-radius:8px; min-width:320px; max-width:90vw; position:relative;">
    <h2>Editar Produto</h2>
    <form id="edit-product-form">
      <input type="hidden" id="edit-id">
      <div class="form-row"><label>Nome:</label><input type="text" id="edit-name" required></div>
      <div class="form-row"><label>Descrição:</label><textarea id="edit-description" required></textarea></div>
      <div class="form-row"><label>Categoria:</label><select id="edit-category" required></select></div>
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
    
    // Popula o dropdown e seleciona a categoria correta
    await populateCategoryDropdown('edit-category', product.categoriaId);
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
document.getElementById('close-modal').onclick = closeEditModal;

// Função de Salvar Edição
async function updateProductInFirestore(productId, data) {
  await db.collection('produtos').doc(productId).update(data);
}
document.getElementById('edit-product-form').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const nome = document.getElementById('edit-name').value;
  const descricao = document.getElementById('edit-description').value;
  const categoriaId = document.getElementById('edit-category').value; // Salva o ID da categoria
  const preco = parseFloat(document.getElementById('edit-price').value);
  const estoque = parseInt(document.getElementById('edit-stock').value, 10);
  const imagens = document.getElementById('edit-images').value.split(',').map(i => i.trim());
  
  await updateProductInFirestore(id, { nome, descricao, categoriaId, preco, imagens, estoque });
  
  closeEditModal();
  await displayProducts();
};

// Cadastro de novos produtos
document.getElementById('product-form').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    const nome = document.getElementById('name').value;
    const descricao = document.getElementById('description').value;
    const categoriaId = document.getElementById('category').value; // Pega o ID da categoria
    const preco = parseFloat(document.getElementById('price').value);
    const estoque = parseInt(document.getElementById('stock').value, 10);
    const imagens = document.getElementById('images').value.split(',').map(img => img.trim());

    const newProduct = { nome, descricao, categoriaId, preco, imagens, estoque };

    await addProduct(newProduct);

    this.reset();
    const feedback = document.getElementById('feedback-message');
    if (feedback) {
      feedback.textContent = 'Produto cadastrado com sucesso!';
      feedback.style.color = 'green';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
    
    await displayProducts();
});

// Exibe os produtos e popula os formulários quando a página é carregada
window.addEventListener('load', async () => {
    await populateCategoryDropdown('category');
    await criarControlesDeFiltro();
    await displayProducts();
});