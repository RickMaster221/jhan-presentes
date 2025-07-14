// js/database.js

// Inicializa o serviço do Cloud Firestore
const db = firebase.firestore();

// --- FUNÇÕES DE PRODUTOS ---

// Função para adicionar um novo produto ao Firestore
async function addProduct(product) {
  try {
    const docRef = await db.collection("produtos").add(product);
    console.log("Produto cadastrado com o ID: ", docRef.id);
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
  }
}

// Função para buscar todos os produtos do Firestore
async function getProducts() {
  const products = [];
  const querySnapshot = await db.collection("produtos").get();
  querySnapshot.forEach((doc) => {
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

// --- FUNÇÕES DE CATEGORIAS (NOVAS) ---

// Função para buscar todas as categorias
async function getCategories() {
    const categories = [];
    const querySnapshot = await db.collection("categorias").orderBy("nome").get();
    querySnapshot.forEach((doc) => {
        categories.push({ id: doc.id, ...doc.data() });
    });
    return categories;
}

// Função para adicionar uma nova categoria
async function addCategory(category) {
    try {
        await db.collection("categorias").add(category);
    } catch (e) {
        console.error("Erro ao adicionar categoria: ", e);
    }
}

// Função para atualizar uma categoria existente
async function updateCategory(categoryId, data) {
    try {
        await db.collection("categorias").doc(categoryId).update(data);
    } catch (e) {
        console.error("Erro ao atualizar categoria: ", e);
    }
}

// Função para deletar uma categoria
async function deleteCategory(categoryId) {
    try {
        await db.collection("categorias").doc(categoryId).delete();
    } catch (e) {
        console.error("Erro ao deletar categoria: ", e);
    }
}