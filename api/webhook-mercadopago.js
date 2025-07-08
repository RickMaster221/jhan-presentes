// /api/webhook-mercadopago.js
const admin = require('firebase-admin');

// --- Configuração do Firebase Admin ---
// Verifica se o app já foi inicializado
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// --- Função Principal do Webhook ---
module.exports = async (request, response) => {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { type, data } = request.body;

    // Verifica se é uma notificação de pagamento criado e aprovado
    if (type === 'payment') {
        const paymentId = data.id;
        console.log(`Recebida notificação para o pagamento: ${paymentId}`);

        try {
            // Busca os detalhes completos do pagamento no Mercado Pago
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
                }
            });

            if (!mpResponse.ok) {
                throw new Error('Falha ao buscar detalhes do pagamento no Mercado Pago.');
            }

            const paymentDetails = await mpResponse.json();

            // Verifica se o pagamento está realmente aprovado
            if (paymentDetails.status === 'approved') {
                console.log('Pagamento aprovado. Atualizando estoque...');

                const items = paymentDetails.additional_info.items;

                // Percorre cada item comprado para atualizar o estoque
                for (const item of items) {
                    const productId = item.id;
                    const quantidadeComprada = parseInt(item.quantity, 10);

                    const productRef = db.collection('produtos').doc(productId);

                    // Usa uma transação para garantir a atualização segura do estoque
                    await db.runTransaction(async (transaction) => {
                        const productDoc = await transaction.get(productRef);
                        if (!productDoc.exists) {
                            console.log(`Produto com ID ${productId} não encontrado no Firestore.`);
                            return;
                        }

                        const estoqueAtual = productDoc.data().estoque || 0;
                        const novoEstoque = estoqueAtual - quantidadeComprada;

                        transaction.update(productRef, { estoque: novoEstoque });
                        console.log(`Estoque do produto ${productId} atualizado de ${estoqueAtual} para ${novoEstoque}.`);
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao processar o webhook:", error);
            return response.status(500).json({ error: 'Erro interno ao processar notificação.' });
        }
    }

    // Responde ao Mercado Pago com status 200 para confirmar o recebimento
    response.status(200).send('Notificação recebida.');
};