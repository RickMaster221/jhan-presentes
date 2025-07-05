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

        // Imagem
        const imageUrl = (product.imagens && product.imagens.length > 0) ? product.imagens[0] : 'https://via.placeholder.com/60';
        cellImage.innerHTML = `<img src="${imageUrl}" alt="Imagem" width="60">`;
        // Nome
        cellName.textContent = product.nome || '-';
        // Categorias
        cellCategories.textContent = Array.isArray(product.categorias) ? product.categorias.join(', ') : (product.categorias || '-');
        // Preço
        cellPrice.textContent = (typeof product.preco === 'number') ? `R$ ${product.preco.toFixed(2).replace('.', ',')}` : 'Preço indisponível';
        // Ações
        cellActions.innerHTML = `
            <button class="btn-action" onclick="editProduct('${product.id}')">Editar</button>
            <button class="btn-action delete" onclick="removeProduct('${product.id}')">Excluir</button>
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

// Adiciona o modal de edição ao final do body
const modalHtml = `
<div id="edit-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:9999; justify-content:center; align-items:center;">
  <div style="background:#fff; padding:30px; border-radius:8px; min-width:320px; max-width:90vw; position:relative;">
    <h2>Editar Produto</h2>
    <form id="edit-product-form">
      <input type="hidden" id="edit-id">
      <div class="form-row"><label>Nome:</label><input type="text" id="edit-name" required></div>
      <div class="form-row"><label>Descrição:</label><textarea id="edit-description" required></textarea></div>
      <div class="form-row"><label>Categorias:</label><input type="text" id="edit-categories"></div>
      <div class="form-row"><label>Preço (R$):</label><input type="number" id="edit-price" step="0.01" required></div>
      <div class="form-row"><label>Imagens (URLs):</label><input type="text" id="edit-images"></div>
      <div style="margin-top:15px; text-align:right;">
        <button type="button" id="close-modal" style="margin-right:10px;">Cancelar</button>
        <button type="submit" class="btn-submit">Salvar</button>
      </div>
    </form>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalHtml);

// Função para abrir o modal e preencher com os dados do produto
window.editProduct = async function(productId) {
  const products = await getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return alert('Produto não encontrado!');
  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.nome || '';
  document.getElementById('edit-description').value = product.descricao || '';
  document.getElementById('edit-categories').value = Array.isArray(product.categorias) ? product.categorias.join(', ') : (product.categorias || '');
  document.getElementById('edit-price').value = product.preco || '';
  document.getElementById('edit-images').value = (product.imagens && product.imagens.length > 0) ? product.imagens.join(', ') : '';
  document.getElementById('edit-modal').style.display = 'flex';
}

// Fecha o modal
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
document.getElementById('close-modal').onclick = closeEditModal;

// Salva as alterações
async function updateProductInFirestore(productId, data) {
  await db.collection('produtos').doc(productId).update(data);
}
document.getElementById('edit-product-form').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const nome = document.getElementById('edit-name').value;
  const descricao = document.getElementById('edit-description').value;
  const categorias = document.getElementById('edit-categories').value.split(',').map(c => c.trim());
  const preco = parseFloat(document.getElementById('edit-price').value);
  const imagens = document.getElementById('edit-images').value.split(',').map(i => i.trim());
  await updateProductInFirestore(id, { nome, descricao, categorias, preco, imagens });
  closeEditModal();
  if (typeof displayProducts === 'function') displayProducts();
  else location.reload();
};

// Listener para o formulário de cadastro de produto
document.getElementById('product-form').addEventListener('submit', function(event) {
    event.preventDefault(); 
    
    const nome = document.getElementById('name').value;
    const descricao = document.getElementById('description').value;
    const categorias = document.getElementById('categories').value.split(',').map(cat => cat.trim());
    const preco = parseFloat(document.getElementById('price').value);
    const imagens = document.getElementById('images').value.split(',').map(img => img.trim());

    const newProduct = { nome, descricao, categorias, preco, imagens };

    addProduct(newProduct);

    // Limpa o formulário e dá um feedback
    this.reset();
    const feedback = document.getElementById('feedback-message');
    if (feedback) {
      feedback.textContent = 'Produto cadastrado com sucesso!';
      feedback.style.color = 'green';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }

    // Atualiza a tabela para mostrar o novo produto
    displayProducts();
});

// Exibe os produtos na tabela assim que a página é carregada
window.addEventListener('load', displayProducts);