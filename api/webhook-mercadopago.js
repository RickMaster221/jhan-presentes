// /api/webhook-mercadopago.js (Versão final com validação e baixa de estoque)
const admin = require('firebase-admin');
const crypto = require('crypto'); // Módulo para a validação

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

// --- Função de Validação de Assinatura ---
function validateSignature(request, secret) {
    const signature = request.headers['x-signature'];
    const requestId = request.headers['x-request-id'];

    if (!signature || !requestId) {
        throw new Error('Assinatura ou ID da requisição ausente no cabeçalho.');
    }

    const parts = signature.split(',');
    const ts = parts.find(part => part.startsWith('ts=')).split('=')[1];
    const hash = parts.find(part => part.startsWith('v1=')).split('=')[1];
    
    const manifest = `id:${requestId};request-timestamp:${ts};`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== hash) {
        throw new Error('Assinatura do Webhook inválida.');
    }
    console.log("✅ Assinatura do Webhook validada com sucesso.");
}


// --- Função Principal do Webhook ---
module.exports = async (request, response) => {
    try {
        // 1. Valida a assinatura para garantir que a requisição é do Mercado Pago
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        if (secret) {
            validateSignature(request, secret);
        } else {
            console.warn("⚠️ A variável de ambiente MERCADOPAGO_WEBHOOK_SECRET não está configurada. A validação foi ignorada.");
        }

        // 2. Continua com a sua lógica de processamento
        const { type, data } = request.body;
        if (type === 'payment' && data && data.id) {
            const paymentId = data.id;
            console.log(`Recebida notificação para o pagamento: ${paymentId}`);

            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
            });
            if (!mpResponse.ok) {
                const errorBody = await mpResponse.text();
                throw new Error(`Falha ao buscar detalhes do pagamento no MP: ${errorBody}`);
            }
            const paymentDetails = await mpResponse.json();

            if (paymentDetails.status === 'approved') {
                console.log('Pagamento aprovado. Iniciando atualização de estoque...');
                
                const items = paymentDetails.additional_info ? paymentDetails.additional_info.items : [];
                if (!items || items.length === 0) {
                    console.log("Nenhum item encontrado no pagamento para atualizar.");
                    return response.status(200).send('OK: Pagamento aprovado sem itens para atualizar.');
                }

                const batch = db.batch();
                items.forEach(item => {
                    if (item.id === 'frete') return;
                    
                    const productId = item.id;
                    const quantidadeComprada = parseInt(item.quantity, 10);
                    
                    if (!productId || isNaN(quantidadeComprada)) {
                        console.warn("Item inválido encontrado, pulando:", item);
                        return;
                    }

                    const productRef = db.collection('produtos').doc(productId);
                    batch.update(productRef, { 
                        estoque: admin.firestore.FieldValue.increment(-quantidadeComprada) 
                    });
                    console.log(`Produto ${productId}: estoque será decrementado em ${quantidadeComprada}.`);
                });

                await batch.commit();
                console.log("Estoque atualizado com sucesso no Firebase.");
            } else {
                console.log(`Status do pagamento não é 'approved' (${paymentDetails.status}). Nenhuma ação de estoque necessária.`);
            }
        }
        
        // Responde ao Mercado Pago que a notificação foi recebida com sucesso.
        response.status(200).send('Notificação recebida.');

    } catch (error) {
        console.error("ERRO no processamento do webhook:", error.message);
        // Se a assinatura for inválida, é um erro de segurança (Proibido)
        if (error.message.includes('Assinatura')) {
            return response.status(403).send(error.message);
        }
        // Para outros erros, responde 200 para o MP não ficar reenviando, mas loga o erro.
        return response.status(200).json({ status: 'error', message: error.message });
    }
};