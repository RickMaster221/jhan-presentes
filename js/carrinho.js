// js/carrinho.js

document.addEventListener('DOMContentLoaded', async function() {
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    const acoesContainer = document.getElementById('carrinho-acoes');
    
    // Pega todos os produtos do banco de dados (Firestore)
    const todosProdutos = await getProducts();
    // Pega os itens do carrinho salvos no navegador
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        if (totalContainer) totalContainer.style.display = 'none';
        if (acoesContainer) acoesContainer.style.display = 'none';
        return;
    }

    // Inicia a construção da tabela de itens
    let htmlItens = `<table class="product-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Quantidade</th>
                                <th>Subtotal</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>`;

    let totalCarrinho = 0;
    const itensParaCheckout = []; // Lista para enviar ao back-end

    // Itera sobre cada item no carrinho
    carrinho.forEach(item => {
        // Encontra os detalhes completos do produto usando o ID
        const produtoInfo = todosProdutos.find(p => p.id === item.id);

        if (produtoInfo) {
            const subtotal = produtoInfo.preco * item.quantidade;
            totalCarrinho += subtotal;
            
            // Adiciona o item formatado à lista que será enviada para pagamento
            itensParaCheckout.push({
                nome: produtoInfo.nome,
                preco: produtoInfo.preco,
                quantidade: item.quantidade,
            });

            const img = (produtoInfo.imagens && produtoInfo.imagens.length > 0) ? produtoInfo.imagens[0] : 'https://via.placeholder.com/60';
            
            // Constrói a linha (<tr>) da tabela para este item
            htmlItens += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center;">
                            <img src="${img}" alt="${produtoInfo.nome}" width="60" style="margin-right: 10px; border-radius: 4px;">
                            <span>${produtoInfo.nome}</span>
                        </div>
                    </td>
                    <td>R$ ${produtoInfo.preco.toFixed(2).replace('.', ',')}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                    <td><button class="btn-action delete" onclick="removerDoCarrinho('${item.id}')">Remover</button></td>
                </tr>
            `;
        }
    });

    // Fecha as tags da tabela
    htmlItens += `</tbody></table>`;
    
    // Insere a tabela completa no container
    if (carrinhoContainer) carrinhoContainer.innerHTML = htmlItens;

    // Atualiza o valor total
    if (totalContainer) totalContainer.innerHTML = `<strong>Total: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</strong>`;

    // Adiciona o evento ao botão de finalizar compra
    const btnFinalizar = acoesContainer ? acoesContainer.querySelector('.btn-submit') : null;
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async () => {
            btnFinalizar.textContent = 'Processando...';
            btnFinalizar.disabled = true;

            try {
                // Envia os itens do carrinho para nossa função serverless
                const response = await fetch('/api/criar-pagamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itensParaCheckout })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao criar a preferência de pagamento.');
                }

                const data = await response.json();
                const preferenceId = data.preference_id;
                
                // Limpa o carrinho e redireciona para a página de checkout
                localStorage.removeItem('carrinho');
                window.location.href = `checkout.html?pref_id=${preferenceId}`;

            } catch (error) {
                console.error('Erro:', error);
                alert('Não foi possível iniciar o pagamento. Tente novamente.');
                btnFinalizar.textContent = 'Finalizar Compra';
                btnFinalizar.disabled = false;
            }
        });
    }
});

// Função para remover item do carrinho
function removerDoCarrinho(productId) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const novoCarrinho = carrinho.filter(item => item.id !== productId);
    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    // Recarrega a página para mostrar o carrinho atualizado
    window.location.reload();
}