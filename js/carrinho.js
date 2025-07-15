// js/carrinho.js (Versão Final Completa)

// Função global para o botão 'Remover' funcionar, já que ele é adicionado dinamicamente.
function removerDoCarrinho(productId) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const novoCarrinho = carrinho.filter(item => item.id !== productId);
    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    // Recarrega a página para refletir a remoção
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', async function() {
    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    const acoesContainer = document.getElementById('carrinho-acoes');
    const calculoFreteContainer = document.getElementById('calculo-frete');
    
    // Campos de dados do comprador (NOVOS)
    const firstNameInput = document.getElementById('payer-first-name');
    const lastNameInput = document.getElementById('payer-last-name');

    // Campos de endereço
    const cepInput = document.getElementById('cep-destino');
    const ruaInput = document.getElementById('rua-destino');
    const numeroInput = document.getElementById('numero-destino');
    const bairroInput = document.getElementById('bairro-destino');
    const cidadeInput = document.getElementById('cidade-destino');
    const estadoInput = document.getElementById('estado-destino');
    
    // Botões e containers de frete
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');
    const opcoesFreteContainer = document.getElementById('opcoes-frete');
    const freteErrorContainer = document.getElementById('frete-error');
    const btnFinalizar = document.getElementById('btn-finalizar-compra');
    
    // --- VARIÁVEIS DE ESTADO ---
    let totalCarrinho = 0;
    let freteSelecionado = 0;
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    let produtosNoCarrinho = [];

    /**
     * Busca os detalhes dos produtos que estão no carrinho a partir do Firestore.
     */
    async function fetchProductsInCart() {
        if (carrinho.length === 0) return [];
        const db = firebase.firestore();
        const productIds = carrinho.map(item => item.id);
        const produtosTemp = [];

        // O Firestore tem um limite de 10 itens por consulta 'in', então dividimos em lotes
        const promises = [];
        for (let i = 0; i < productIds.length; i += 10) {
            const batchIds = productIds.slice(i, i + 10);
            promises.push(db.collection('produtos').where(firebase.firestore.FieldPath.documentId(), 'in', batchIds).get());
        }

        const snapshots = await Promise.all(promises);
        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                produtosTemp.push({ id: doc.id, ...doc.data() });
            });
        });

        // Combina os dados do Firestore com a quantidade do carrinho
        return carrinho.map(item => {
            const productInfo = produtosTemp.find(p => p.id === item.id);
            return productInfo ? { ...productInfo, quantidade: item.quantidade } : null;
        }).filter(Boolean); // Remove itens nulos caso um produto tenha sido deletado
    }

    /**
     * Atualiza o display do valor total do carrinho, incluindo o frete.
     */
    function atualizarTotalComFrete() {
        const novoTotal = totalCarrinho + freteSelecionado;
        if (totalContainer) {
            totalContainer.innerHTML = `
                <div style="line-height: 1.6;">
                    <span style="font-size: 0.9em;">Subtotal: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</span><br>
                    <span style="font-size: 0.9em;">Frete: R$ ${freteSelecionado.toFixed(2).replace('.', ',')}</span><br>
                    <strong style="font-size: 1.2em;">Total: R$ ${novoTotal.toFixed(2).replace('.', ',')}</strong>
                </div>
            `;
        }
    }

    /**
     * Busca o endereço a partir do CEP usando a API ViaCEP.
     */
    async function preencherEndereco(cep) {
        freteErrorContainer.textContent = '';
        ruaInput.value = 'Buscando...';
        bairroInput.value = 'Buscando...';
        cidadeInput.value = 'Buscando...';
        estadoInput.value = '...';

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (data.erro) throw new Error("CEP não encontrado.");
            
            ruaInput.value = data.logradouro || '';
            bairroInput.value = data.bairro || '';
            cidadeInput.value = data.localidade || '';
            estadoInput.value = data.uf || '';
            numeroInput.focus();
        } catch (error) {
            freteErrorContainer.textContent = 'CEP não encontrado. Preencha o endereço manualmente.';
            ruaInput.value = ''; bairroInput.value = ''; cidadeInput.value = ''; estadoInput.value = '';
        }
    }

    /**
     * Monta e exibe a tabela de itens do carrinho.
     */
    async function montarCarrinho() {
        if (carrinho.length === 0) {
            carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
            if (totalContainer) totalContainer.style.display = 'none';
            if (acoesContainer) acoesContainer.style.display = 'none';
            if (calculoFreteContainer) calculoFreteContainer.style.display = 'none';
            if (firstNameInput) firstNameInput.closest('div').style.display = 'none'; // Esconde a seção de dados do comprador
            return;
        }

        produtosNoCarrinho = await fetchProductsInCart();
        let htmlItens = `
            <table class="product-table">
                <thead><tr><th>Produto</th><th>Preço</th><th>Quantidade</th><th>Subtotal</th><th>Ação</th></tr></thead>
                <tbody>`;
        
        totalCarrinho = 0;
        produtosNoCarrinho.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            totalCarrinho += subtotal;
            const img = (item.imagens && item.imagens.length > 0) ? item.imagens[0] : 'https://via.placeholder.com/60';
            
            htmlItens += `
                <tr>
                    <td><div style="display: flex; align-items: center;"><img src="${img}" alt="${item.nome}" width="60" style="margin-right: 10px; border-radius: 4px;"><span>${item.nome}</span></div></td>
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

    // --- EVENT LISTENERS ---

    if (cepInput) {
        cepInput.addEventListener('input', e => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                preencherEndereco(cep);
            }
        });
    }

    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', async () => {
            const para_cep = cepInput.value.replace(/\D/g, '');
            if (para_cep.length !== 8) {
                freteErrorContainer.textContent = 'Por favor, digite um CEP válido.';
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
                        de_cep: "14711600", // CEP de origem fixo
                        para_cep: para_cep,
                        produtos: carrinhoParaFrete,
                        to_address: {
                            address: ruaInput.value,
                            number: numeroInput.value,
                            neighborhood: bairroInput.value,
                            city: cidadeInput.value,
                            state: estadoInput.value
                        }
                    })
                });
                if (!response.ok) throw new Error("Erro do servidor ao calcular frete.");

                const opcoes = await response.json();
                if (opcoes.length === 0 || opcoes.some(o => o.error)) {
                    opcoesFreteContainer.innerHTML = '<p style="color: #dc3545;">Nenhuma opção de frete encontrada para este CEP.</p>';
                    return;
                }

                let opcoesHtml = '<h4>Escolha uma opção de entrega:</h4>';
                opcoes.forEach(opcao => {
                    opcoesHtml += `
                        <label style="display: block; margin-bottom: 5px; cursor: pointer; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                            <input type="radio" name="opcao_frete" value="${opcao.price}">
                            <strong>${opcao.name}</strong> - R$ ${Number(opcao.price).toFixed(2).replace('.', ',')} (Prazo: ${opcao.delivery_time} dias)
                        </label>
                    `;
                });
                opcoesFreteContainer.innerHTML = opcoesHtml;

                document.querySelectorAll('input[name="opcao_frete"]').forEach(r => {
                    r.addEventListener('change', function() {
                        freteSelecionado = parseFloat(this.value);
                        atualizarTotalComFrete();
                    });
                });

            } catch (error) {
                console.error("Erro ao calcular frete:", error);
                freteErrorContainer.textContent = 'Não foi possível calcular o frete.';
                opcoesFreteContainer.innerHTML = '';
            }
        });
    }

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async () => {
            // Validações
            if (produtosNoCarrinho.length > 0 && freteSelecionado <= 0) {
                alert("Por favor, calcule e selecione uma opção de frete.");
                return;
            }
            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            if (!firstName || !lastName) {
                alert("Por favor, preencha seu nome e sobrenome.");
                return;
            }
            if (!numeroInput.value.trim()) {
                alert("Por favor, preencha o número do endereço.");
                return;
            }

            btnFinalizar.textContent = 'Processando...';
            btnFinalizar.disabled = true;

            // Mapeia os itens do carrinho com TODOS os detalhes necessários para a API
            const itensParaCheckout = produtosNoCarrinho.map(item => ({
                id: item.id,
                nome: item.nome,
                descricao: item.descricao || item.nome, // Usa a descrição ou o nome como fallback
                categoriaId: (item.categoriaIds && item.categoriaIds.length > 0) ? item.categoriaIds[0] : 'default', // Usa a primeira categoria
                preco: item.preco,
                quantidade: item.quantidade
            }));

            // Adiciona o frete como um item
            if (freteSelecionado > 0) {
                itensParaCheckout.push({
                    id: 'frete',
                    nome: 'Custo de Envio',
                    descricao: 'Serviço de entrega',
                    categoriaId: 'frete',
                    preco: freteSelecionado,
                    quantidade: 1
                });
            }

            try {
                const response = await fetch('/api/criar-pagamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: itensParaCheckout,
                        payer: {
                            first_name: firstName,
                            last_name: lastName
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao criar preferência de pagamento.');
                }
                
                const data = await response.json();
                localStorage.removeItem('carrinho');
                window.location.href = `checkout.html?pref_id=${data.preference_id}`;

            } catch (error) {
                console.error('Erro ao finalizar compra:', error);
                alert('Não foi possível iniciar o pagamento: ' + error.message);
                btnFinalizar.textContent = 'Finalizar Compra';
                btnFinalizar.disabled = false;
            }
        });
    }

    // Inicia a renderização do carrinho
    montarCarrinho();
});