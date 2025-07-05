// js/database.js

// Inicializa o serviço do Cloud Firestore
const db = firebase.firestore();

// Função para adicionar um novo produto ao Firestore
async function addProduct(product) {
  try {
    // Adiciona um novo "documento" à coleção "produtos"
    const docRef = await db.collection("produtos").add(product);
    console.log("Produto cadastrado com o ID: ", docRef.id);
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
  }
}

// Função para buscar todos os produtos do Firestore
async function getProducts() {
  const products = [];
  // Pega um "snapshot" (uma foto) de todos os documentos na coleção "produtos"
  const querySnapshot = await db.collection("produtos").get();

  querySnapshot.forEach((doc) => {
    // Adiciona o ID do documento junto com os dados do produto
    products.push({ id: doc.id, ...doc.data() });
  });

  return products;
}

// Função para deletar um produto do Firestore pelo seu ID
async function deleteProduct(productId) {
  try {
    await db.collection("produtos").doc(productId).delete();
    console.log("Produto deletado com sucesso!");
  } catch (e) {
    console.error("Erro ao deletar produto: ", e);
  }
}