const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const controller = require('../controllers/produtoController');

// --- ROTAS PÚBLICAS (Vitrine / Catálogo do E-commerce) ---
router.get('/', controller.listarProdutosPublico);
router.get('/produtos/:id', controller.detalharProdutoPublico);

// --- ROTAS ADMINISTRATIVAS (Painel de Gestão) ---
router.get('/admin/produtos', controller.listarProdutosAdmin);
router.get('/admin/produtos/novo', controller.exibirFormularioCadastro);
router.post('/admin/produtos', upload.array('imagens', 10), controller.cadastrarProduto);

router.get('/admin/produtos/:id/editar', controller.exibirFormularioEdicao);
router.post('/admin/produtos/:id/atualizar', upload.array('imagens', 10), controller.atualizarProduto);

router.post('/admin/produtos/:id/deletar', controller.deletarProduto);
router.post('/admin/imagens/:id/deletar', controller.deletarImagem);
router.post('/admin/imagens/:id/definir-capa', controller.definirCapa);

module.exports = router;