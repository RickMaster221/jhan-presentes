import express from 'express';
import sqlite3 from 'sqlite3'; // Ou 'better-sqlite3' para sincronia/melhor performance
import { open } from 'sqlite'; // Ajuda a abrir o banco de dados de forma assíncrona
import dotenv from 'dotenv';
import mercadopago from 'mercadopago';
import bcrypt from 'bcryptjs'; // Para hashing de senha
import session from 'express-session'; // Para gerenciar sessões
import multer from 'multer'; // Para upload de arquivos
import path from 'path';
import { fileURLToPath } from 'url';
import flash from 'express-flash'; // Para mensagens flash (requer cookie-parser e session)
import cookieParser from 'cookie-parser';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Determina o diretório atual para uso com `path.join`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do Mercado Pago ---
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const PUBLIC_KEY = process.env.MP_PUBLIC_KEY;

if (!ACCESS_TOKEN || !PUBLIC_KEY) {
    console.error("Erro: Variáveis de ambiente MP_ACCESS_TOKEN ou MP_PUBLIC_KEY não encontradas.");
    console.error("Certifique-se de que o arquivo .env está presente e contém as chaves.");
    process.exit(1); // Encerra a aplicação se as chaves não existirem
}

mercadopago.configure({
    access_token: ACCESS_TOKEN,
});

// --- Inicialização do Aplicativo Express ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Banco de Dados SQLite ---
const DATABASE = path.join(__dirname, 'database', 'database.db');
const UPLOAD_FOLDER = path.join(__dirname, 'public', 'uploads'); // Pasta para uploads de imagens

// Garante que a pasta de uploads exista
import fs from 'fs';
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        // Gera um nome de arquivo único para evitar colisões
        const ext = path.extname(file.originalname);
        cb(null, `${req.productId}_${Date.now()}${ext}`); // req.productId será definido antes do upload
    }
});

// Filtro de arquivos permitidos
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não permitido. Apenas imagens (jpeg, jpg, png, gif)."));
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

let db; // Variável para armazenar a conexão com o banco de dados

// Função para obter a conexão com o banco de dados
async function getDb() {
    if (!db) {
        db = await open({
            filename: DATABASE,
            driver: sqlite3.Database,
        });
        db.get('PRAGMA foreign_keys = ON'); // Habilita chaves estrangeiras
    }
    return db;
}

// Função para inicializar o esquema do banco de dados
async function initDb() {
    try {
        const db = await getDb();
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                is_admin BOOLEAN NOT NULL DEFAULT 0
            );
        `);
        await db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                preco REAL NOT NULL,
                quantidade INTEGER NOT NULL,
                categoria TEXT
            );
        `);
        await db.exec(`
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            );
        `);
        console.log("Banco de dados inicializado/verificado.");
    } catch (error) {
        console.error("Erro ao inicializar o banco de dados:", error);
        process.exit(1); // Encerra a aplicação em caso de erro no DB
    }
}

// --- Middlewares do Express ---
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear dados de formulário
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos da pasta public

// Configuração da sessão
app.use(cookieParser()); // Necessário para express-session e express-flash
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_very_secret_key_here', // Use uma chave secreta forte do .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hora de sessão
}));
app.use(flash()); // Habilita mensagens flash

// Configuração do EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Define a pasta de views

// Middleware para disponibilizar informações da sessão nas views
app.use((req, res, next) => {
    res.locals.user_id = req.session.user_id;
    res.locals.is_admin = req.session.is_admin;
    res.locals.cart_count = req.session.cart ? req.session.cart.length : 0;
    next();
});

// Middleware de autenticação para rotas de admin
const requireAdmin = (req, res, next) => {
    if (!req.session.user_id || !req.session.is_admin) {
        req.flash('warning', 'Acesso não autorizado. Você deve ser um administrador para acessar esta página.');
        return res.redirect('/login');
    }
    next();
};

// --- Rotas do Aplicativo ---

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/produtos', async (req, res) => {
    const { category, id: prod_id } = req.query;
    const db = await getDb();

    try {
        if (prod_id) {
            // Detalhes de um único produto
            const prod = await db.get('SELECT * FROM products WHERE id = ?', prod_id);
            if (!prod) {
                req.flash("error", "Produto não encontrado.");
                return res.redirect('/produtos');
            }
            const imgs = await db.all('SELECT filename FROM images WHERE product_id = ?', prod_id);
            res.render('produtos', { produto: prod, images: imgs });
        } else {
            // Lista de produtos (por categoria ou todos)
            let prods_raw;
            if (category) {
                prods_raw = await db.all('SELECT * FROM products WHERE categoria = ?', category);
            } else {
                prods_raw = await db.all('SELECT * FROM products');
            }

            const prods = await Promise.all(prods_raw.map(async (p) => {
                const img = await db.get('SELECT filename FROM images WHERE product_id = ? LIMIT 1', p.id);
                return {
                    ...p,
                    imagem: img ? img.filename : 'sem-imagem.png'
                };
            }));
            res.render('produtos', { produtos: prods });
        }
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        req.flash("error", "Ocorreu um erro ao carregar os produtos.");
        res.redirect('/');
    }
});

app.post('/adicionar', async (req, res) => {
    const { id_produto, quantidade } = req.body;

    try {
        const parsedQuantidade = parseInt(quantidade);
        if (isNaN(parsedQuantidade) || parsedQuantidade <= 0) {
            req.flash("warning", "Quantidade inválida.");
            return res.redirect(`/produtos?id=${id_produto}`);
        }

        if (!req.session.cart) {
            req.session.cart = [];
        }

        let found = false;
        for (let item of req.session.cart) {
            if (String(item.id) === String(id_produto)) {
                item.quantidade += parsedQuantidade;
                found = true;
                break;
            }
        }
        if (!found) {
            req.session.cart.push({ id: id_produto, quantidade: parsedQuantidade });
        }

        req.flash("success", `Produto adicionado ao carrinho: ${parsedQuantidade} unidades.`);
    } catch (error) {
        console.error("Erro ao adicionar produto ao carrinho:", error);
        req.flash("error", "Ocorreu um erro ao adicionar o produto ao carrinho.");
    }
    res.redirect('/carrinho');
});

app.get('/carrinho', async (req, res) => {
    let itens_carrinho = [];
    let total = 0;

    if (req.session.cart && req.session.cart.length > 0) {
        const db = await getDb();
        for (const item of req.session.cart) {
            const prod = await db.get('SELECT * FROM products WHERE id = ?', item.id);
            if (prod) {
                // Verifica a disponibilidade de estoque (opcional)
                if (item.quantidade > prod.quantidade) {
                    req.flash("warning", `Atenção: A quantidade de '${prod.nome}' no seu carrinho excede o estoque disponível (${prod.quantidade}). Ajuste o carrinho.`);
                    // item.quantidade = prod.quantidade; // Exemplo de ajuste automático
                }

                const subtotal = prod.preco * item.quantidade;
                total += subtotal;
                const img = await db.get('SELECT filename FROM images WHERE product_id = ? LIMIT 1', prod.id);
                itens_carrinho.push({
                    id: prod.id,
                    nome: prod.nome,
                    imagem: img ? img.filename : 'sem-imagem.png',
                    quantidade: item.quantidade,
                    preco: prod.preco,
                    subtotal: subtotal
                });
            }
        }
    }
    res.render('carrinho', { itens: itens_carrinho, total: total });
});

app.get('/remover/:prod_id', (req, res) => {
    const prod_id = parseInt(req.params.prod_id);

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => parseInt(item.id) !== prod_id);
        req.flash("info", "Item removido do carrinho.");
    }
    res.redirect('/carrinho');
});

app.get('/finalizar', async (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        req.flash("warning", "Seu carrinho está vazio.");
        return res.redirect('/');
    }

    const db = await getDb();
    try {
        await db.run('BEGIN TRANSACTION'); // Inicia uma transação

        for (const item of req.session.cart) {
            const prod = await db.get('SELECT * FROM products WHERE id = ?', item.id);
            if (prod) {
                const novo_estoque = prod.quantidade - item.quantidade;
                if (novo_estoque < 0) {
                    req.flash("error", `Estoque insuficiente para ${prod.nome}.`);
                    await db.run('ROLLBACK'); // Reverte a transação
                    return res.redirect('/carrinho');
                }
                await db.run('UPDATE products SET quantidade = ? WHERE id = ?', novo_estoque, prod.id);
            }
        }
        await db.run('COMMIT'); // Confirma a transação
        req.session.cart = []; // Limpa o carrinho
        req.flash("success", "Compra finalizada com sucesso! Estoque atualizado.");
    } catch (error) {
        await db.run('ROLLBACK'); // Reverte as mudanças em caso de erro
        console.error("Erro ao finalizar compra e atualizar estoque:", error);
        req.flash("error", "Ocorreu um erro ao finalizar sua compra. Tente novamente.");
    }
    res.redirect('/');
});

// Rotas de Login e Cadastro
app.get('/login', (req, res) => {
    res.render('login', { error: req.flash('error') });
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    const db = await getDb();

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', email);

        if (user && await bcrypt.compare(senha, user.senha)) {
            req.session.user_id = user.id;
            req.session.is_admin = Boolean(user.is_admin);
            req.flash("success", "Login bem-sucedido!");
            return res.redirect(req.session.is_admin ? '/admin' : '/');
        } else {
            req.flash("error", "Credenciais inválidas. Verifique seu e-mail e senha.");
            return res.render('login', { error: req.flash('error') });
        }
    } catch (error) {
        console.error("Erro no login:", error);
        req.flash("error", "Ocorreu um erro durante o login.");
        res.render('login', { error: req.flash('error') });
    }
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro', { error: req.flash('error') });
});

app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    const db = await getDb();

    try {
        const hashed_senha = await bcrypt.hash(senha, 10); // Gera o hash da senha (salt de 10)

        await db.run('INSERT INTO users (nome, email, senha, is_admin) VALUES (?, ?, ?, ?)', nome, email, hashed_senha, 0);
        req.flash("success", "Cadastro realizado com sucesso! Faça login para continuar.");
        res.redirect('/login');
    } catch (error) {
        if (error.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email')) {
            req.flash("error", "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.");
        } else {
            console.error("Erro ao cadastrar:", error);
            req.flash("error", `Ocorreu um erro ao cadastrar: ${error.message}`);
        }
        res.render('cadastro', { error: req.flash('error') });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao fazer logout:", err);
            req.flash("error", "Ocorreu um erro ao fazer logout.");
        } else {
            req.flash("info", "Você foi desconectado.");
        }
        res.redirect('/');
    });
});

// Área Administrativa
app.get('/admin', requireAdmin, async (req, res) => {
    const db = await getDb();
    try {
        const produtos = await db.all('SELECT * FROM products');
        res.render('admin', {
            produtos: produtos,
            error: req.flash('error'),
            success: req.flash('success'),
            warning: req.flash('warning')
        });
    } catch (error) {
        console.error("Erro ao carregar painel admin:", error);
        req.flash("error", "Ocorreu um erro ao carregar os produtos no painel de administração.");
        res.redirect('/');
    }
});

app.post('/admin', requireAdmin, upload.array('imagens'), async (req, res) => {
    const { nome, descricao, preco, quantidade, categorias, idade_min, idade_max } = req.body;
    const db = await getDb();

    try {
        // Conversões seguras
        const parsedPreco = parseFloat(preco);
        const parsedQuantidade = parseInt(quantidade);
        const parsedIdadeMin = parseInt(idade_min);
        const parsedIdadeMax = parseInt(idade_max);

        // Processa categorias como texto separado por vírgulas
        const categoriasArray = categorias.split(',').map(c => c.trim());
        const categoriasString = categoriasArray.join(', '); // Ou JSON.stringify(categoriasArray)

        // Validações básicas
        if (
            isNaN(parsedPreco) || parsedPreco <= 0 ||
            isNaN(parsedQuantidade) || parsedQuantidade < 0 ||
            isNaN(parsedIdadeMin) || isNaN(parsedIdadeMax) || parsedIdadeMin > parsedIdadeMax
        ) {
            req.flash("error", "Verifique os valores inseridos. Preço, quantidade e faixa etária devem ser válidos.");
            return res.redirect('/admin');
        }

        // Insere o produto
        const result = await db.run(
            'INSERT INTO products (nome, descricao, preco, quantidade, categoria, idade_min, idade_max) VALUES (?, ?, ?, ?, ?, ?, ?)',
            nome, descricao, parsedPreco, parsedQuantidade, categoriasString, parsedIdadeMin, parsedIdadeMax
        );

        const pid = result.lastID;

        // Insere as imagens
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await db.run('INSERT INTO images (product_id, filename) VALUES (?, ?)', pid, file.filename);
            }
            req.flash("success", "Produto e imagens cadastrados com sucesso!");
        } else {
            req.flash("warning", "Produto cadastrado, mas nenhuma imagem foi enviada.");
        }

        res.redirect('/admin');

    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        req.flash("error", `Erro ao cadastrar produto: ${error.message}`);
        res.redirect('/admin');
    }
});


app.get('/editar/:id', requireAdmin, async (req, res) => {
    const prod_id = req.params.id;
    const db = await getDb();

    try {
        const prod = await db.get('SELECT * FROM products WHERE id = ?', prod_id);
        if (!prod) {
            req.flash("error", "Produto não encontrado.");
            return res.redirect('/admin');
        }
        res.render('editar_produto', { produto: prod, error: req.flash('error') });
    } catch (error) {
        console.error("Erro ao buscar produto para edição:", error);
        req.flash("error", "Ocorreu um erro ao carregar os detalhes do produto.");
        res.redirect('/admin');
    }
});

app.post('/editar/:id', requireAdmin, async (req, res) => {
    const prod_id = req.params.id;
    const { nome, descricao, preco, quantidade, categoria } = req.body;
    const db = await getDb();

    try {
        const parsedPreco = parseFloat(preco);
        const parsedQuantidade = parseInt(quantidade);

        if (isNaN(parsedPreco) || isNaN(parsedQuantidade) || parsedPreco <= 0 || parsedQuantidade < 0) {
            req.flash("error", "Preço e quantidade devem ser valores numéricos positivos.");
            const prod = await db.get('SELECT * FROM products WHERE id = ?', prod_id);
            return res.render('editar_produto', { produto: prod, error: req.flash('error') });
        }

        await db.run('UPDATE products SET nome=?, descricao=?, preco=?, quantidade=?, categoria=? WHERE id=?',
            nome, descricao, parsedPreco, parsedQuantidade, categoria, prod_id);
        req.flash("success", "Produto atualizado com sucesso!");
        res.redirect('/admin');
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        req.flash("error", `Erro ao atualizar produto: ${error.message}`);
        const prod = await db.get('SELECT * FROM products WHERE id = ?', prod_id);
        res.render('editar_produto', { produto: prod, error: req.flash('error') });
    }
});

app.post('/excluir/:id', requireAdmin, async (req, res) => {
    const prod_id = req.params.id;
    const db = await getDb();

    try {
        // Obtém os nomes de arquivo das imagens para excluí-las do sistema de arquivos
        const images = await db.all('SELECT filename FROM images WHERE product_id = ?', prod_id);
        for (const img of images) {
            const filepath = path.join(UPLOAD_FOLDER, img.filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`Arquivo ${filepath} removido.`);
            }
        }

        // Exclui o produto (ON DELETE CASCADE cuidará das imagens do DB)
        await db.run('DELETE FROM products WHERE id = ?', prod_id);
        req.flash("success", "Produto e imagens associadas excluídos com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        req.flash("error", `Erro ao excluir produto: ${error.message}`);
    }
    res.redirect('/admin');
});

// Rotas de status do pagamento do Mercado Pago
app.get('/pagamento/concluido', (req, res) => {
    req.flash("success", "Seu pagamento foi concluído com sucesso!");
    res.render('pagamento_feedback', { status: "sucesso" });
});

app.get('/pagamento/pendente', (req, res) => {
    req.flash("info", "Seu pagamento está pendente de aprovação.");
    res.render('pagamento_feedback', { status: "pendente" });
});

app.get('/pagamento/falhou', (req, res) => {
    req.flash("error", "Seu pagamento falhou. Por favor, tente novamente.");
    res.render('pagamento_feedback', { status: "falha" });
});

app.post('/mp_webhook', (req, res) => {
    // Lógica do webhook do Mercado Pago aqui
    // Você precisa verificar a assinatura do webhook e processar a notificação.
    console.log("Webhook do Mercado Pago recebido:", req.body);

    // Exemplo:
    // const event_type = req.body.type;
    // if (event_type === 'payment') {
    //     const payment_id = req.body.data?.id;
    //     // Faça uma consulta à API do Mercado Pago para obter detalhes completos do pagamento
    //     // (use mercadopago.payment.get(payment_id))
    //     // E atualize o status do seu pedido no banco de dados
    //     console.log(`Pagamento ${payment_id} recebido via webhook.`);
    //     // Aqui você chamaria a lógica para FINALIZAR a compra,
    //     // como subtrair do estoque, registrar a venda, etc.
    //     // Certifique-se de que esta lógica seja idempotente para evitar problemas
    //     // se o webhook for enviado várias vezes.
    // }

    res.status(200).send(''); // Responde com 200 OK para o Mercado Pago
});

app.post('/checkout', async (req, res) => {
    let itens_para_mp = [];
    let total_carrinho = 0;
    const db = await getDb();

    if (!req.session.cart || req.session.cart.length === 0) {
        req.flash("warning", "Seu carrinho está vazio. Adicione produtos antes de finalizar a compra.");
        return res.redirect('/carrinho');
    }

    try {
        for (const item of req.session.cart) {
            const prod = await db.get('SELECT * FROM products WHERE id = ?', item.id);
            if (prod) {
                const preco_unitario = parseFloat(prod.preco);
                const quantidade_item = item.quantidade;
                total_carrinho += preco_unitario * quantidade_item;
                itens_para_mp.push({
                    title: prod.nome,
                    quantity: quantidade_item,
                    unit_price: preco_unitario,
                    currency_id: "BRL"
                });
            }
        }

        if (itens_para_mp.length === 0) {
            req.flash("error", "Não há itens válidos no carrinho para processar o checkout.");
            return res.redirect('/carrinho');
        }

        // Define URLs de retorno dinamicamente
        const base_url = `${req.protocol}://${req.get('host')}`;
        const back_urls = {
            success: `${base_url}/pagamento/concluido`,
            pending: `${base_url}/pagamento/pendente`,
            failure: `${base_url}/pagamento/falhou`
        };

        const preference_data = {
            items: itens_para_mp,
            back_urls: back_urls,
            auto_return: "approved",
            // Adicione o URL do webhook aqui (precisa ser um URL acessível publicamente em produção)
            // notification_url: `${base_url}/mp_webhook`
        };

        const pref_result = await mercadopago.preferences.create(preference_data);

        if (pref_result && pref_result.response && pref_result.response.id) {
            const preference_id = pref_result.response.id;
            res.render('checkout', {
                public_key: PUBLIC_KEY,
                preference_id: preference_id,
                itens: itens_para_mp,
                total: total_carrinho
            });
        } else {
            console.error("⚠️ Erro ao criar preferência:", pref_result);
            req.flash("error", `Erro ao gerar preferência de pagamento: ${pref_result.message || 'Erro desconhecido'}`);
            res.redirect('/carrinho');
        }
    } catch (error) {
        console.error("Erro inesperado no checkout:", error);
        req.flash("error", `Ocorreu um erro inesperado ao processar o checkout: ${error.message}`);
        res.redirect('/carrinho');
    }
});


// --- Inicialização do Servidor ---
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});