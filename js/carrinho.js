// js/carrinho.js

document.addEventListener('DOMContentLoaded', async function() {
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    
    // Pega todos os produtos do banco de dados (Firestore)
    const todosProdutos = await getProducts();
    // Pega os itens do carrinho salvos no navegador
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalContainer.style.display = 'none';
        document.getElementById('carrinho-acoes').style.display = 'none';
        return;
    }

    let htmlItens = `<table class="product-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Quantidade</th>
                                <th>Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>`;
    let totalCarrinho = 0;

    carrinho.forEach(item => {
        // Encontra os detalhes completos do produto usando o ID
        const produtoInfo = todosProdutos.find(p => p.id === item.id);

        if (produtoInfo) {
            const subtotal = produtoInfo.preco * item.quantidade;
            totalCarrinho += subtotal;
            const img = (produtoInfo.imagens && produtoInfo.imagens.length > 0) ? produtoInfo.imagens[0] : 'https://via.placeholder.com/60';
            
            htmlItens += `
                <tr>
                    <td>
                        <img src="${img}" alt="${produtoInfo.nome}" width="60" style="vertical-align: middle; margin-right: 10px;">
                        ${produtoInfo.nome}
                    </td>
                    <td>R$ ${produtoInfo.preco.toFixed(2).replace('.', ',')}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                    <td><button class="btn-action delete" onclick="removerDoCarrinho('${item.id}')">Remover</button></td>
                </tr>
            `;
        }
    });

    htmlItens += `</tbody></table>`;
    carrinhoContainer.innerHTML = htmlItens;

    totalContainer.innerHTML = `<strong>Total: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</strong>`;
});

function removerDoCarrinho(productId) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    // Filtra o carrinho, mantendo apenas os itens que NÃO têm o ID a ser removido
    const novoCarrinho = carrinho.filter(item => item.id !== productId);
    // Salva o novo carrinho no localStorage
    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    // Recarrega a página para mostrar o carrinho atualizado
    window.location.reload();
}