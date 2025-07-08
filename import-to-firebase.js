// import-to-firebase.js (Corrigido para incluir estoque)
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const produtos = JSON.parse(fs.readFileSync(path.join(__dirname, 'produtos-ml.json'), 'utf8'));

async function importarProdutos() {
  const produtosCollection = db.collection('produtos');
  console.log('Iniciando importação para o Firestore...');

  for (const produto of produtos) {
    try {
      // Cria uma referência para um novo documento com um ID gerado automaticamente
      const docRef = produtosCollection.doc(); 
      await docRef.set({
        nome: produto.name,
        descricao: produto.description,
        categorias: produto.categories,
        preco: produto.price,
        imagens: produto.images,
        estoque: produto.estoque || 0 // <-- CAMPO DE ESTOQUE ADICIONADO
      });
      console.log(`Produto importado: ${produto.name}`);
    } catch (e) {
      console.error('Erro ao importar produto:', produto.name, e.message);
    }
  }
  console.log('Importação finalizada!');
}

importarProdutos();