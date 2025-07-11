// js/carrinho.js (Versão com auto preenchimento de endereço)

document.addEventListener('DOMContentLoaded', async function() {
    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    const acoesContainer = document.getElementById('carrinho-acoes');
    const cepInput = document.getElementById('cep-destino');
    const ruaInput = document.getElementById('rua-destino');
    const numeroInput = document.getElementById('numero-destino');
    const bairroInput = document.getElementById('bairro-destino');
    const cidadeInput = document.getElementById('cidade-destino');
    const estadoInput = document.getElementById('estado-destino');
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');
    const opcoesFreteContainer = document.getElementById('opcoes-frete');
    const freteErrorContainer = document.getElementById('frete-error');
    
    // --- VARIÁVEIS DE ESTADO ---
    let totalCarrinho = 0;
    let freteSelecionado = 0;
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    let produtosNoCarrinho = [];

    // --- FUNÇÃO PARA AUTO PREENCHER ENDEREÇO ---
    async function preencherEndereco(cep) {
        freteErrorContainer.textContent = '';
        ruaInput.value = 'Buscando...';
        bairroInput.value = 'Buscando...';
        cidadeInput.value = 'Buscando...';
        estadoInput.value = '...';

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                throw new Error("CEP não encontrado.");
            }

            ruaInput.value = data.logradouro || '';
            bairroInput.value = data.bairro || '';
            cidadeInput.value = data.localidade || '';
            estadoInput.value = data.uf || '';
            
            // Foca no campo de número para o usuário preencher
            numeroInput.focus();

        } catch (error) {
            freteErrorContainer.textContent = 'CEP não encontrado. Preencha o endereço manualmente.';
            // Habilita os campos para preenchimento manual
            ruaInput.readOnly = false;
            bairroInput.readOnly = false;
            cidadeInput.readOnly = false;
            estadoInput.readOnly = false;
            ruaInput.value = '';
            bairroInput.value = '';
            cidadeInput.value = '';
            estadoInput.value = '';
        }
    }

    // Adiciona o listener para o campo de CEP
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                preencherEndereco(cep);
            }
        });
    }

    // (O resto do seu carrinho.js continua aqui, com pequenas alterações)
    // ...
    // Eu vou colocar o código completo abaixo para garantir
});

// A função de remover precisa ser global para o onclick funcionar
function removerDoCarrinho(productId) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const novoCarrinho = carrinho.filter(item => item.id !== productId);
    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    window.location.reload();
}

// Para garantir, aqui está o código completo e correto para o carrinho.js
// Você pode substituir o seu por este
document.addEventListener('DOMContentLoaded', async function() {
    const carrinhoContainer = document.getElementById('carrinho-container');
    const totalContainer = document.getElementById('carrinho-total');
    const acoesContainer = document.getElementById('carrinho-acoes');
    const cepInput = document.getElementById('cep-destino');
    const ruaInput = document.getElementById('rua-destino');
    const numeroInput = document.getElementById('numero-destino');
    const bairroInput = document.getElementById('bairro-destino');
    const cidadeInput = document.getElementById('cidade-destino');
    const estadoInput = document.getElementById('estado-destino');
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');
    const opcoesFreteContainer = document.getElementById('opcoes-frete');
    const freteErrorContainer = document.getElementById('frete-error');

    let totalCarrinho = 0;
    let freteSelecionado = 0;
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    let produtosNoCarrinho = [];

    async function fetchProductsInCart() {
        if (carrinho.length === 0) return [];
        const db = firebase.firestore();
        const productIds = carrinho.map(item => item.id);
        const produtosTemp = [];
        const promises = [];
        for (let i = 0; i < productIds.length; i += 10) {
            const batchIds = productIds.slice(i, i + 10);
            promises.push(db.collection('produtos').where(firebase.firestore.FieldPath.documentId(), 'in', batchIds).get());
        }
        const snapshots = await Promise.all(promises);
        snapshots.forEach(s => s.forEach(doc => produtosTemp.push({ id: doc.id, ...doc.data() })));
        return carrinho.map(item => {
            const info = produtosTemp.find(p => p.id === item.id);
            return info ? { ...info, quantidade: item.quantidade } : null;
        }).filter(Boolean);
    }

    function atualizarTotalComFrete() {
        const novoTotal = totalCarrinho + freteSelecionado;
        if (totalContainer) {
            totalContainer.innerHTML = `<div style="line-height: 1.6;"><span style="font-size: 0.9em;">Subtotal: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</span><br><span style="font-size: 0.9em;">Frete: R$ ${freteSelecionado.toFixed(2).replace('.', ',')}</span><br><strong style="font-size: 1.2em;">Total: R$ ${novoTotal.toFixed(2).replace('.', ',')}</strong></div>`;
        }
    }

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

    async function montarCarrinho() {
        if (carrinho.length === 0) {
            carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
            if (totalContainer) totalContainer.style.display = 'none';
            if (acoesContainer) acoesContainer.style.display = 'none';
            document.getElementById('calculo-frete').style.display = 'none';
            return;
        }
        produtosNoCarrinho = await fetchProductsInCart();
        let htmlItens = `<table class="product-table"><thead><tr><th>Produto</th><th>Preço</th><th>Quantidade</th><th>Subtotal</th><th>Ação</th></tr></thead><tbody>`;
        totalCarrinho = 0;
        produtosNoCarrinho.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            totalCarrinho += subtotal;
            const img = (item.imagens && item.imagens.length > 0) ? item.imagens[0] : 'https://via.placeholder.com/60';
            htmlItens += `<tr><td><div style="display: flex; align-items: center;"><img src="${img}" alt="${item.nome}" width="60" style="margin-right: 10px; border-radius: 4px;"><span>${item.nome}</span></div></td><td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td><td>${item.quantidade}</td><td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td><td><button class="btn-action delete" onclick="removerDoCarrinho('${item.id}')">Remover</button></td></tr>`;
        });
        htmlItens += `</tbody></table>`;
        if (carrinhoContainer) carrinhoContainer.innerHTML = htmlItens;
        atualizarTotalComFrete();
    }

    if (cepInput) cepInput.addEventListener('input', e => { const cep = e.target.value.replace(/\D/g, ''); if (cep.length === 8) preencherEndereco(cep); });

    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', async () => {
            const para_cep = cepInput.value.replace(/\D/g, '');
            if (para_cep.length !== 8) { freteErrorContainer.textContent = 'Por favor, digite um CEP válido.'; return; }
            freteErrorContainer.textContent = '';
            opcoesFreteContainer.innerHTML = 'Calculando...';
            const carrinhoParaFrete = produtosNoCarrinho.map(p => ({ id: p.id, largura_cm: p.largura_cm || 15, altura_cm: p.altura_cm || 5, comprimento_cm: p.comprimento_cm || 20, peso_kg: p.peso_kg || 0.3, preco: p.preco, quantidade: p.quantidade }));
            try {
                const response = await fetch('/api/calcular-frete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de_cep: "14711600", para_cep: para_cep, produtos: carrinhoParaFrete, to_address: { address: ruaInput.value, number: numeroInput.value, neighborhood: bairroInput.value, city: cidadeInput.value, state: estadoInput.value } }) });
                if (!response.ok) throw new Error("Erro do servidor.");
                const opcoes = await response.json();
                if (opcoes.length === 0) { opcoesFreteContainer.innerHTML = '<p style="color: #dc3545;">Nenhuma opção de frete encontrada.</p>'; return; }
                let opcoesHtml = '<h4>Escolha uma opção de entrega:</h4>';
                opcoes.forEach(opcao => {
                    opcoesHtml += `
                        <label style="display: block; margin-bottom: 5px; cursor: pointer; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                            <input type="radio" name="opcao_frete" value="${opcao.price}">
                            <strong>${opcao.name}</strong> - R$ ${opcao.price} (Prazo: ${opcao.delivery_time} dias)
                        </label>
                    `;
                });
                opcoesFreteContainer.innerHTML = opcoesHtml;
                document.querySelectorAll('input[name="opcao_frete"]').forEach(r => r.addEventListener('change', function() { freteSelecionado = parseFloat(this.value); atualizarTotalComFrete(); }));
            } catch (error) { console.error("Erro:", error); freteErrorContainer.textContent = 'Não foi possível calcular o frete.'; opcoesFreteContainer.innerHTML = ''; }
        });
    }

    const btnFinalizar = document.getElementById('btn-finalizar-compra');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async () => {
            if (produtosNoCarrinho.length > 0 && freteSelecionado <= 0) { alert("Por favor, calcule e selecione o frete."); return; }
            if (!numeroInput.value.trim()) { alert("Por favor, preencha o número do endereço."); return; }
            btnFinalizar.textContent = 'Processando...'; btnFinalizar.disabled = true;
            const itensParaCheckout = produtosNoCarrinho.map(item => ({ id: item.id, nome: item.nome, preco: item.preco, quantidade: item.quantidade }));
            itensParaCheckout.push({ id: 'frete', nome: 'Custo de Envio', preco: freteSelecionado, quantidade: 1 });
            try {
                const response = await fetch('/api/criar-pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: itensParaCheckout }) });
                if (!response.ok) throw new Error('Falha ao criar preferência de pagamento.');
                const data = await response.json();
                localStorage.removeItem('carrinho');
                window.location.href = `checkout.html?pref_id=${data.preference_id}`;
            } catch (error) { console.error('Erro:', error); alert('Não foi possível iniciar o pagamento.'); btnFinalizar.textContent = 'Finalizar Compra'; btnFinalizar.disabled = false; }
        });
    }

    montarCarrinho();
});