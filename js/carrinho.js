// js/carrinho.js (Versão final otimizada)

document.addEventListener('DOMContentLoaded', async function() {
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    const acoesContainer = document.getElementById('carrinho-acoes');

    let totalCarrinho = 0;
    let freteSelecionado = 0;
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    let produtosNoCarrinho = [];

    // Função otimizada para buscar apenas os produtos que estão no carrinho
    async function fetchProductsInCart() {
        if (carrinho.length === 0) return [];
        
        const db = firebase.firestore();
        const productIds = carrinho.map(item => item.id);
        const produtosTemp = [];

        const promises = [];
        for (let i = 0; i < productIds.length; i += 10) {
            const batchIds = productIds.slice(i, i + 10);
            promises.push(
                db.collection('produtos').where(firebase.firestore.FieldPath.documentId(), 'in', batchIds).get()
            );
        }

        const snapshots = await Promise.all(promises);
        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                produtosTemp.push({ id: doc.id, ...doc.data() });
            });
        });

        return carrinho.map(item => {
            const produtoInfo = produtosTemp.find(p => p.id === item.id);
            return produtoInfo ? { ...produtoInfo, quantidade: item.quantidade } : null;
        }).filter(item => item !== null); // Remove itens que não foram encontrados
    }

    function atualizarTotalComFrete() {
        const novoTotal = totalCarrinho + freteSelecionado;
        if (totalContainer) {
            totalContainer.innerHTML = `
                <div style="line-height: 1.6;">
                    <span style="font-size: 0.9em;">Subtotal dos produtos: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</span><br>
                    <span style="font-size: 0.9em;">Frete: R$ ${freteSelecionado.toFixed(2).replace('.', ',')}</span><br>
                    <strong style="font-size: 1.2em;">Total: R$ ${novoTotal.toFixed(2).replace('.', ',')}</strong>
                </div>
            `;
        }
    }

    async function montarCarrinho() {
        if (carrinho.length === 0) {
            carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
            if (totalContainer) totalContainer.style.display = 'none';
            if (acoesContainer) acoesContainer.style.display = 'none';
            document.getElementById('calculo-frete').style.display = 'none';
            return;
        }
        
        produtosNoCarrinho = await fetchProductsInCart();

        let htmlItens = `<table class="product-table">
                            <thead>
                                <tr><th>Produto</th><th>Preço</th><th>Quantidade</th><th>Subtotal</th><th>Ação</th></tr>
                            </thead>
                            <tbody>`;
        totalCarrinho = 0;

        produtosNoCarrinho.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            totalCarrinho += subtotal;
            const img = (item.imagens && item.imagens.length > 0) ? item.imagens[0] : 'https://via.placeholder.com/60';
            
            htmlItens += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center;">
                            <img src="${img}" alt="${item.nome}" width="60" style="margin-right: 10px; border-radius: 4px;">
                            <span>${item.nome}</span>
                        </div>
                    </td>
                    <td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                    <td><button class="btn-action delete" onclick="removerDoCarrinho('${item.id}')">Remover</button></td>
                </tr>`;
        });

        htmlItens += `</tbody></table>`;
        if (carrinhoContainer) carrinhoContainer.innerHTML = htmlItens;
        
        atualizarTotalComFrete();
    }

    // --- LÓGICA DO FRETE ---
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');
    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', async () => {
            const cepInput = document.getElementById('cep-destino');
            const freteErrorContainer = document.getElementById('frete-error');
            const opcoesFreteContainer = document.getElementById('opcoes-frete');
            const para_cep = cepInput.value.replace(/\D/g, '');

            if (para_cep.length !== 8) {
                freteErrorContainer.textContent = 'Por favor, digite um CEP válido com 8 dígitos.';
                return;
            }
            
            freteErrorContainer.textContent = '';
            opcoesFreteContainer.innerHTML = 'Calculando...';

            const carrinhoParaFrete = produtosNoCarrinho.map(p => ({
                id: p.id,
                largura_cm: p.largura_cm || 15,
                altura_cm: p.altura_cm || 5,
                comprimento_cm: p.comprimento_cm || 20,
                peso_kg: p.peso_kg || 0.3,
                preco: p.preco,
                quantidade: p.quantidade
            }));

            try {
                const response = await fetch('/api/calcular-frete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        de_cep: "14711600",
                        para_cep: para_cep,
                        produtos: carrinhoParaFrete
                    })
                });
                
                if (!response.ok) throw new Error("Erro do servidor ao calcular frete.");
                const opcoes = await response.json();

                if (opcoes.length === 0) {
                    opcoesFreteContainer.innerHTML = '<p style="color: #dc3545;">Nenhuma opção de frete encontrada para este CEP.</p>';
                    return;
                }

                let opcoesHtml = '<h4>Escolha uma opção de entrega:</h4>';
                opcoes.forEach(opcao => {
                    opcoesHtml += `
                        <label style="display: block; margin-bottom: 5px; cursor: pointer; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                            <input type="radio" name="opcao_frete" value="${opcao.price}">
                            <strong>${opcao.name}</strong> - R$ ${opcao.price} (Prazo: ${opcao.delivery_time} dias)
                        </label>`;
                });
                opcoesFreteContainer.innerHTML = opcoesHtml;

                document.querySelectorAll('input[name="opcao_frete"]').forEach(radio => {
                    radio.addEventListener('change', function() {
                        freteSelecionado = parseFloat(this.value);
                        atualizarTotalComFrete();
                    });
                });
            } catch (error) {
                console.error("Erro ao calcular frete:", error);
                freteErrorContainer.textContent = 'Não foi possível calcular o frete. Tente novamente.';
                opcoesFreteContainer.innerHTML = '';
            }
        });
    }

    // --- LÓGICA DE FINALIZAR COMPRA ---
    const btnFinalizar = document.getElementById('btn-finalizar-compra');
    if(btnFinalizar) {
        btnFinalizar.addEventListener('click', async () => {
            if (carrinho.length > 0 && freteSelecionado <= 0) {
                alert("Por favor, calcule e selecione uma opção de frete antes de finalizar a compra.");
                return;
            }

            btnFinalizar.textContent = 'Processando...';
            btnFinalizar.disabled = true;

            const itensParaCheckout = produtosNoCarrinho.map(item => ({
                id: item.id,
                nome: item.nome,
                preco: item.preco,
                quantidade: item.quantidade
            }));
            
            itensParaCheckout.push({
                id: 'frete',
                nome: 'Custo de Envio',
                preco: freteSelecionado,
                quantidade: 1
            });
            
            try {
                const response = await fetch('/api/criar-pagamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itensParaCheckout })
                });

                if (!response.ok) throw new Error('Falha ao criar a preferência de pagamento.');

                const data = await response.json();
                localStorage.removeItem('carrinho');
                window.location.href = `checkout.html?pref_id=${data.preference_id}`;
            } catch (error) {
                console.error('Erro:', error);
                alert('Não foi possível iniciar o pagamento. Tente novamente.');
                btnFinalizar.textContent = 'Finalizar Compra';
                btnFinalizar.disabled = false;
            }
        });
    }

    montarCarrinho();
});

function removerDoCarrinho(productId) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const novoCarrinho = carrinho.filter(item => item.id !== productId);
    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    window.location.reload();
}