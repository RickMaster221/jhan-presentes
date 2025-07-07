// js/carrinho.js

 // (O início do arquivo continua o mesmo)
 document.addEventListener('DOMContentLoaded', async function() {
     const carrinhoContainer = document.getElementById('carrinho-container');
     const totalContainer = document.getElementById('carrinho-total');
     const acoesContainer = document.getElementById('carrinho-acoes');

     const todosProdutos = await getProducts();
     const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

     if (carrinho.length === 0) {
         carrinhoContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
         totalContainer.style.display = 'none';
         acoesContainer.style.display = 'none';
         return;
     }

     let htmlItens = `<table class="product-table"> ... </tbody></table>`; // O HTML da tabela continua igual
     let totalCarrinho = 0;
     const itensParaCheckout = []; // Nova lista para enviar ao back-end

     carrinho.forEach(item => {
         const produtoInfo = todosProdutos.find(p => p.id === item.id);
         if (produtoInfo) {
             const subtotal = produtoInfo.preco * item.quantidade;
             totalCarrinho += subtotal;
             // Adiciona o item formatado à lista de checkout
             itensParaCheckout.push({
                 nome: produtoInfo.nome,
                 preco: produtoInfo.preco,
                 quantidade: item.quantidade,
             });
             // ... (o resto da criação do HTML da tabela continua igual)
         }
     });
     
     carrinhoContainer.innerHTML = htmlItens; // Renderiza a tabela
     totalContainer.innerHTML = `<strong>Total: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}</strong>`;

     // --- LÓGICA DO BOTÃO FINALIZAR COMPRA ---
     const btnFinalizar = acoesContainer.querySelector('.btn-submit');
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
                 throw new Error('Falha ao criar a preferência de pagamento.');
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
 });

 function removerDoCarrinho(productId) {
     // ... (função removerDoCarrinho continua igual)
 }