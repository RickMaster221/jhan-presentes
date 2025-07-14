// js/gerenciar-categorias.js

/**
 * Exibe todas as categorias na tabela.
 */
async function displayCategories() {
    const categories = await getCategories();
    const tableBody = document.getElementById('category-list-body');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Limpa a tabela antes de preencher

    categories.forEach(category => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${category.nome}</td>
            <td>
                <button class="btn-action" onclick="editCategory('${category.id}', '${category.nome}')">Editar</button>
                <button class="btn-action delete" onclick="removeCategory('${category.id}')">Excluir</button>
            </td>
        `;
    });
}

/**
 * Prepara o formulário para editar uma categoria existente.
 * @param {string} id - O ID da categoria.
 * @param {string} name - O nome atual da categoria.
 */
window.editCategory = (id, name) => {
    document.getElementById('category-id').value = id;
    document.getElementById('category-name').value = name;
    document.getElementById('cancel-edit').style.display = 'inline-block';
    document.querySelector('#category-form .btn-submit').textContent = 'Atualizar Categoria';
}

/**
 * Limpa o formulário e o retorna ao modo de "cadastro".
 */
function cancelEdit() {
    document.getElementById('category-form').reset();
    document.getElementById('category-id').value = '';
    document.getElementById('cancel-edit').style.display = 'none';
    document.querySelector('#category-form .btn-submit').textContent = 'Salvar Categoria';
}

/**
 * Deleta uma categoria do banco de dados.
 * @param {string} categoryId - O ID da categoria a ser deletada.
 */
async function removeCategory(categoryId) {
    if (confirm('Tem certeza que deseja excluir esta categoria? Isso não pode ser desfeito.')) {
        await deleteCategory(categoryId);
        displayCategories(); // Atualiza a lista na tela
    }
}


// --- EVENT LISTENERS ---

// Listener do formulário principal (para salvar ou atualizar)
document.getElementById('category-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('category-id').value;
    const categoryName = document.getElementById('category-name').value;
    const feedback = document.getElementById('feedback-message');

    try {
        if (categoryId) {
            // Se tem um ID, está atualizando
            await updateCategory(categoryId, { nome: categoryName });
            feedback.textContent = 'Categoria atualizada com sucesso!';
        } else {
            // Se não tem ID, está criando uma nova
            await addCategory({ nome: categoryName });
            feedback.textContent = 'Categoria cadastrada com sucesso!';
        }
        
        feedback.style.color = 'green';
        setTimeout(() => { feedback.textContent = ''; }, 3000);

        cancelEdit();
        displayCategories();

    } catch (error) {
        console.error("Erro ao salvar categoria:", error);
        feedback.textContent = 'Ocorreu um erro. Tente novamente.';
        feedback.style.color = 'red';
    }
});

// Listener para o botão de cancelar edição
document.getElementById('cancel-edit').addEventListener('click', cancelEdit);

// Carrega as categorias assim que a página é aberta
window.addEventListener('load', displayCategories);