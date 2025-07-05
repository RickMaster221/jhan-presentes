// Script para importar produtos do arquivo produtos-ml.json para o Firestore do Firebase
// Uso: node import-to-firebase.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Caminho do arquivo de credenciais do Firebase (baixe do console do Firebase)
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Lê o arquivo de produtos
const produtos = JSON.parse(fs.readFileSync(path.join(__dirname, 'produtos-ml.json'), 'utf8'));

async function importarProdutos() {
  for (const produto of produtos) {
    try {
      await db.collection('produtos').add({
        nome: produto.name,
        descricao: produto.description,
        categorias: produto.categories,
        preco: produto.price,
        imagens: produto.images
      });
      console.log(`Produto importado: ${produto.name}`);
    } catch (e) {
      console.error('Erro ao importar produto:', produto.name, e.message);
    }
  }
  console.log('Importação finalizada!');
}

importarProdutos();
