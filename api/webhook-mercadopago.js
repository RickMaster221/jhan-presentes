// /api/webhook-mercadopago.js (Versão final com baixa de estoque)
const admin = require('firebase-admin');

// --- Configuração do Firebase Admin ---
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch(error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}
const db = admin.firestore();

// --- Função Principal do Webhook ---
module.exports = async (request, response) => {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { type, data } = request.body;

    // Processa apenas notificações de pagamento
    if (type === 'payment' && data && data.id) {
        const paymentId = data.id;
        console.log(`Recebida notificação para o pagamento: ${paymentId}`);

        try {
            // Busca os detalhes completos do pagamento no Mercado Pago
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
            });
            if (!mpResponse.ok) {
                throw new Error('Falha ao buscar detalhes do pagamento no Mercado Pago.');
            }
            const paymentDetails = await mpResponse.json();

            // Só continua se o pagamento estiver aprovado
            if (paymentDetails.status === 'approved') {
                console.log('Pagamento aprovado. Iniciando atualização de estoque...');
                
                const items = paymentDetails.additional_info ? paymentDetails.additional_info.items : [];
                if (!items || items.length === 0) {
                    console.log("Nenhum item encontrado nos detalhes do pagamento para atualizar.");
                    return response.status(200).send('Pagamento sem itens para atualizar.');
                }

                const batch = db.batch(); // Usamos um batch para atualizar todos os produtos de uma vez

                items.forEach(item => {
                    // Ignora o item "frete" que não tem estoque
                    if (item.id === 'frete') {
                        return; 
                    }

                    const productId = item.id;
                    const quantidadeComprada = parseInt(item.quantity, 10);
                    
                    if (!productId || isNaN(quantidadeComprada)) {
                        console.warn("Item inválido encontrado, pulando:", item);
                        return;
                    }

                    const productRef = db.collection('produtos').doc(productId);
                    
                    // Usa FieldValue.increment para subtrair a quantidade de forma segura
                    batch.update(productRef, { 
                        estoque: admin.firestore.FieldValue.increment(-quantidadeComprada) 
                    });
                    console.log(`Produto ${productId}: estoque será decrementado em ${quantidadeComprada}.`);
                });

                // Executa todas as atualizações de estoque de uma vez
                await batch.commit();
                console.log("Estoque atualizado com sucesso no Firebase.");
            } else {
                console.log(`Status do pagamento não é 'approved' (${paymentDetails.status}). Nenhuma ação de estoque necessária.`);
            }
        } catch (error) {
            console.error("Erro ao processar o webhook:", error);
            return response.status(200).json({ status: 'error', message: error.message });
        }
    }
    
    // Responde ao Mercado Pago com status 200 para confirmar o recebimento
    response.status(200).send('Notificação recebida e processada.');
};