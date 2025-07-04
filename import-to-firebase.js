// Script para importar produtos do arquivo produtos-ml.json para o Firestore do Firebase
// Uso: node import-to-firebase.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// NÃO COLOQUE SUAS CREDENCIAIS NEM TOKENS NESTE SCRIPT PARA SUBIR NO GITHUB!
// Removido o require do serviceAccountKey.json para evitar vazamento de credenciais.
// Para rodar localmente, restaure a linha abaixo e coloque o arquivo serviceAccountKey.json no .gitignore.
// const serviceAccount = require('./serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const db = admin.firestore();

// Lê o arquivo de produtos
// const produtos = JSON.parse(fs.readFileSync(path.join(__dirname, 'produtos-ml.json'), 'utf8'));

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

// importarProdutos();
