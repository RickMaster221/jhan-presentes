// import-to-firebase.js (Versão final com todos os campos)
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Firebase Admin, se ainda não foi inicializado
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const produtos = JSON.parse(fs.readFileSync(path.join(__dirname, 'produtos-ml.json'), 'utf8'));

async function importarProdutos() {
  const produtosCollection = db.collection('produtos');
  console.log('Iniciando importação para o Firestore...');

  for (const produto of produtos) {
    try {
      // Cria uma referência para um novo documento
      const docRef = produtosCollection.doc(); 
      
      // Monta o objeto completo do produto para salvar no Firebase
      await docRef.set({
        nome: produto.name,
        descricao: produto.description,
        categorias: produto.categories,
        preco: produto.price,
        imagens: produto.images,
        estoque: produto.estoque || 0,
        // --- NOVOS CAMPOS ADICIONADOS AQUI ---
        peso_kg: produto.peso_kg || 0.3, // Valor padrão de 300g
        altura_cm: produto.altura_cm || 10,
        largura_cm: produto.largura_cm || 15,
        comprimento_cm: produto.comprimento_cm || 20
      });
      console.log(`Produto importado: ${produto.name}`);
    } catch (e) {
      console.error('Erro ao importar produto:', produto.name, e.message);
    }
  }
  console.log('Importação finalizada!');
}

importarProdutos();