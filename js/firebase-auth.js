// js/firebase-auth.js

// 1. Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAZ2yG95fgUzcQdjgKXxr7dYG1xtPxnZhA",
  authDomain: "jhan-presentes.firebaseapp.com",
  projectId: "jhan-presents",
  storageBucket: "jhan-presentes.firebasestorage.app",
  messagingSenderId: "363084885331",
  appId: "1:363084885331:web:1434352ada331715c3c5a6"
};

// 2. Defina o email do administrador aqui
const ADMIN_EMAIL = "ricardopiresdecarvalhojunior@gmail.com"; 

// --- NÃO ALTERE O CÓDIGO ABAIXO ---

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Função para fazer login
function handleLogin() {
    const email = prompt("Digite seu email:");
    const password = prompt("Digite sua senha:");

    if (!email || !password) {
        alert("Email e senha são obrigatórios.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            // --- LINHA CORRIGIDA ---
            // Verifica pelo novo código de erro do Firebase
            if (error.code === 'auth/invalid-credential') {
                if (confirm("Credenciais inválidas. Deseja criar uma conta com este email e senha?")) {
                    handleSignUp(email, password);
                }
            } else {
                console.error("Erro de login:", error);
                alert("Falha no login: " + error.message);
            }
        });
}

// Função para criar uma nova conta
function handleSignUp(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            alert("Conta criada com sucesso! Você está logado.");
        })
        .catch(error => {
            console.error("Erro de cadastro:", error);
            alert("Falha no cadastro: " + error.message);
        });
}

// Função para fazer logout
function handleLogout() {
    auth.signOut();
}

// Listener que observa mudanças no estado de autenticação
auth.onAuthStateChanged(user => {
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const userProfile = document.getElementById("user-profile");

    if (user) { // Usuário está logado
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';
        if (userProfile) {
            userProfile.style.display = 'flex';
            userProfile.innerHTML = `<span>Olá, ${user.email}</span>`;
        }
        
        if (user.email === ADMIN_EMAIL && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
            window.location.href = 'admin.html';
        }

    } else { // Usuário está deslogado
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
    }
});

// Adiciona os eventos aos botões quando a página inteira carregar
window.addEventListener('load', () => {
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");

    if(btnLogin) {
        btnLogin.addEventListener('click', handleLogin);
    }
    if(btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
});