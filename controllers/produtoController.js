const model = require('../models/produtoModel');
const fs = require('fs');
const path = require('path');

class ProdutoController {
    
    // ==========================================
    // 1. VISÃO PÚBLICA (Vitrine / Catálogo do Cliente)
    // ==========================================

    // Catálogo público (Apenas visualização para clientes)
    static async listarProdutosPublico(req, res) {
        const db = await model.getDb();
        const produtos = await db.all(`
            SELECT p.*, i.url_publica as imagem_principal 
            FROM produtos p 
            LEFT JOIN imagens i ON p.id = i.produto_id AND i.is_principal = 1
        `);

        let htmlCards = '';
        if (produtos.length === 0) {
            htmlCards = `<p>Nenhum produto cadastrado no momento.</p>`;
        } else {
            produtos.forEach(p => {
                htmlCards += `
                    <div class="card">
                        <img src="${p.imagem_principal || 'https://via.placeholder.com/150'}" alt="${p.nome}">
                        <h3>${p.nome}</h3>
                        <p>R$ ${Number(p.preco).toFixed(2)}</p>
                        <a href="/produtos/${p.id}">Ver Detalhes</a>
                    </div>
                `;
            });
        }

        const filePath = path.join(__dirname, '../views/catalogo.html');
        let template = fs.readFileSync(filePath, 'utf8');
        template = template.replace('<!-- PRODUCTS_LIST_PLACEHOLDER -->', htmlCards);
        
        res.send(template);
    }

    // Detalhe público do produto (Com galeria, sem botões de gestão)
    static async detalharProdutoPublico(req, res) {
        const { id } = req.params;
        const db = await model.getDb();
        const produto = await db.get(`SELECT * FROM produtos WHERE id = ?`, [id]);
        const imagens = await db.all(`SELECT * FROM imagens WHERE produto_id = ?`, [id]);

        if (!produto) return res.status(404).send("Produto não encontrado.");

        let galeriaHtml = '';
        imagens.forEach(img => {
            galeriaHtml += `
                <div style="border: 1px solid #ddd; padding: 10px; border-radius: 6px; text-align: center; background: #fafafa;">
                    <img src="${img.url_publica}" width="140" height="140" style="object-fit: cover; border-radius: 4px; display: block; margin-bottom: 5px;">
                    ${img.is_principal ? '<span style="color: #28a745; font-weight: bold; font-size: 12px;">(Capa Principal)</span>' : ''}
                </div>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="utf-8"><title>${produto.nome}</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f9f9f9;">
                <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <h1>${produto.nome}</h1>
                    <p><strong>Descrição:</strong> ${produto.descricao}</p>
                    <p style="color: #28a745; font-size: 22px; font-weight: bold;">R$ ${Number(produto.preco).toFixed(2)}</p>
                    
                    <h3>Galeria de Fotos</h3>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        ${galeriaHtml}
                    </div>
                    
                    <br><hr><a href="/" style="color: #007BFF; text-decoration: none;">&larr; Voltar ao Catálogo</a>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    }


    // ==========================================
    // 2. VISÃO ADMINISTRATIVA (Painel /admin)
    // ==========================================

    // Listagem do painel admin (onde o gestor gerencia tudo)
    static async listarProdutosAdmin(req, res) {
        const db = await model.getDb();
        const produtos = await db.all(`SELECT * FROM produtos`);

        let linhasHtml = '';
        produtos.forEach(p => {
            linhasHtml += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p.id}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p.nome}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">R$ ${Number(p.preco).toFixed(2)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <a href="/admin/produtos/${p.id}/editar" style="background: #ffc107; color: #212529; padding: 5px 10px; text-decoration: none; border-radius: 3px; font-size: 13px; font-weight: bold;">Gerenciar / Editar</a>
                    </td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="utf-8"><title>Painel Administrativo</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f4f6f9;">
                <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
                    <h1>Painel Administrativo — E-commerce (Grupo F)</h1>
                    <a href="/admin/produtos/novo" style="background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 20px;">+ Cadastrar Novo Produto</a>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #e9ecef; text-align: left;">
                                <th style="padding: 10px;">ID</th>
                                <th style="padding: 10px;">Nome</th>
                                <th style="padding: 10px;">Preço</th>
                                <th style="padding: 10px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasHtml || '<tr><td colspan="4" style="padding: 15px; text-align: center;">Nenhum produto cadastrado.</td></tr>'}
                        </tbody>
                    </table>
                    
                    <br><hr><a href="/" style="color: #007BFF; text-decoration: none;">&larr; Ver Loja Pública (Catálogo)</a>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    }

    // Exibir formulário de cadastro
    static exibirFormularioCadastro(req, res) {
        const filePath = path.join(__dirname, '../views/novo-produto.html');
        res.sendFile(filePath);
    }

    // Cadastrar produto e enviar arquivos para o bucket
    static async cadastrarProduto(req, res) {
        try {
            let { nome, descricao, preco, principalIndex } = req.body;
            if (typeof preco === 'string') preco = preco.replace(',', '.');

            const db = await model.getDb();

            const resultado = await db.run(
                `INSERT INTO produtos (nome, descricao, preco) VALUES (?, ?, ?)`,
                [nome, descricao, preco]
            );
            const produtoId = resultado.lastID;

            const arquivos = req.files;
            if (arquivos && arquivos.length > 0) {
                const storage = model.getStorage();
                const bucketName = model.getBucketName();

                for (let i = 0; i < arquivos.length; i++) {
                    const arquivo = arquivos[i];
                    const nomeArquivoUnico = `produto_${produtoId}_${Date.now()}_${arquivo.originalname}`;
                    const blob = storage.bucket(bucketName).file(nomeArquivoUnico);
                    const blobStream = blob.createWriteStream({
                        resumable: false,
                        metadata: { contentType: arquivo.mimetype }
                    });

                    await new Promise((resolve, reject) => {
                        blobStream.on('error', (err) => reject(err));
                        blobStream.on('finish', async () => {
                            const urlPublica = `https://storage.googleapis.com/${bucketName}/${nomeArquivoUnico}`;
                            const isPrincipal = (i.toString() === principalIndex) ? 1 : 0;

                            await db.run(
                                `INSERT INTO imagens (produto_id, nome_arquivo, url_publica, is_principal) VALUES (?, ?, ?, ?)`,
                                [produtoId, nomeArquivoUnico, urlPublica, isPrincipal]
                            );
                            resolve();
                        });
                        blobStream.end(arquivo.buffer);
                    });
                }
            }

            res.redirect('/admin/produtos');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao cadastrar produto.");
        }
    }

    // Exibir formulário de edição (com o formulário envolvendo corretamente todos os campos e o botão de salvar)
    static async exibirFormularioEdicao(req, res) {
        const { id } = req.params;
        const db = await model.getDb();
        const produto = await db.get(`SELECT * FROM produtos WHERE id = ?`, [id]);
        const imagens = await db.all(`SELECT * FROM imagens WHERE produto_id = ?`, [id]);

        if (!produto) return res.status(404).send("Produto não encontrado.");

        let imagensHtml = '';
        imagens.forEach((img) => {
            imagensHtml += `
                <div style="border: 1px solid #ddd; padding: 8px; text-align: center; background: #fafafa; border-radius: 6px; display: inline-block; vertical-align: top;">
                    <img src="${img.url_publica}" width="90" height="90" style="object-fit: cover; display: block; margin-bottom: 5px; border-radius: 4px;">
                    ${img.is_principal 
                        ? '<span style="color:green; font-weight:bold; font-size:11px; display:block; margin-bottom:5px;">★ Capa Atual</span>' 
                        : `<form action="/admin/imagens/${img.id}/definir-capa" method="POST" style="margin-bottom:5px; display:inline;">
                                <button type="submit" style="background: #17a2b8; color: white; border: none; padding: 3px 6px; font-size: 10px; border-radius: 3px; cursor: pointer;">Tornar Capa</button>
                           </form>`
                    }
                    <form action="/admin/imagens/${img.id}/deletar" method="POST" style="display:inline;">
                        <button type="submit" style="background: #dc3545; color: white; border: none; padding: 3px 6px; font-size: 10px; border-radius: 3px; cursor: pointer;">Apagar</button>
                    </form>
                </div>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="utf-8"><title>Gerenciar Produto</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f4f6f9;">
                <div style="max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <h1>Gerenciar / Editar Produto</h1>
                    
                    <!-- SEÇÃO 1: FORMULÁRIO DE TEXTO E NOVAS FOTOS -->
                    <form action="/admin/produtos/${produto.id}/atualizar" method="POST" enctype="multipart/form-data" style="background: #fff; padding: 15px; border: 1px solid #e1e4e8; border-radius: 6px;">
                        <h3>Informações Básicas</h3>
                        <label style="display:block; margin-bottom:10px;">Nome: <br><input type="text" name="nome" value="${produto.nome}" required style="width:100%; padding:8px; margin-top:3px; box-sizing:border-box;"></label>
                        <label style="display:block; margin-bottom:10px;">Descrição: <br><textarea name="descricao" required style="width:100%; padding:8px; margin-top:3px; height:80px; box-sizing:border-box;">${produto.descricao}</textarea></label>
                        <label style="display:block; margin-bottom:15px;">Preço (R$): <br><input type="text" name="preco" value="${produto.preco}" required style="width:100%; padding:8px; margin-top:3px; box-sizing:border-box;"></label>
                        
                        <label style="display:block; margin-bottom:15px;">Adicionar Novas Imagens: <br><input type="file" name="imagens" multiple style="margin-top:3px;"></label>
                        
                        <button type="submit" style="background: #007BFF; color: white; border: none; padding: 12px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%;">Salvar Alterações de Texto</button>
                    </form>

                    <br>
                    <h3>Galeria de Imagens Atuais</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 25px;">
                        ${imagensHtml || '<p>Nenhuma imagem cadastrada.</p>'}
                    </div>

                    <hr style="margin: 20px 0; border:0; border-top:1px solid #ddd;">
                    
                    <!-- SEÇÃO 2: EXCLUSÃO DO PRODUTO -->
                    <form action="/admin/produtos/${produto.id}/deletar" method="POST" onsubmit="return confirm('Deseja apagar permanentemente este produto inteiro e todas as suas imagens do bucket?');">
                        <button type="submit" style="background: #dc3545; color: white; border: none; padding: 10px 15px; border-radius: 5px; font-weight: bold; cursor: pointer;">Excluir Produto Inteiro</button>
                    </form>

                    <br><a href="/admin/produtos" style="color: #6c757d; text-decoration: none; font-size: 14px;">&larr; Voltar ao Painel Admin</a>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    }

    // Definir foto de capa diretamente por clique no botão
    static async definirCapa(req, res) {
        const { id } = req.params;
        const db = await model.getDb();
        
        const imagem = await db.get(`SELECT produto_id FROM imagens WHERE id = ?`, [id]);
        if (imagem) {
            const produtoId = imagem.produto_id;
            await db.run(`UPDATE imagens SET is_principal = 0 WHERE produto_id = ?`, [produtoId]);
            await db.run(`UPDATE imagens SET is_principal = 1 WHERE id = ?`, [id]);
            return res.redirect(`/admin/produtos/${produtoId}/editar`);
        }
        res.redirect('/admin/produtos');
    }

    // Atualizar dados de texto e adicionar novas fotos
    static async atualizarProduto(req, res) {
        try {
            const { id } = req.params;
            let { nome, descricao, preco } = req.body;
            
            if (typeof preco === 'string') {
                preco = preco.replace(',', '.');
            }

            const db = await model.getDb();

            await db.run(
                `UPDATE produtos SET nome = ?, descricao = ?, preco = ? WHERE id = ?`,
                [nome, descricao, preco, id]
            );

            const arquivos = req.files;
            if (arquivos && arquivos.length > 0) {
                const storage = model.getStorage();
                const bucketName = model.getBucketName();

                for (let i = 0; i < arquivos.length; i++) {
                    const arquivo = arquivos[i];
                    const nomeArquivoUnico = `produto_${id}_${Date.now()}_${arquivo.originalname}`;
                    const blob = storage.bucket(bucketName).file(nomeArquivoUnico);
                    const blobStream = blob.createWriteStream({
                        resumable: false,
                        metadata: { contentType: arquivo.mimetype }
                    });

                    await new Promise((resolve, reject) => {
                        blobStream.on('error', (err) => reject(err));
                        blobStream.on('finish', async () => {
                            const urlPublica = `https://storage.googleapis.com/${bucketName}/${nomeArquivoUnico}`;
                            await db.run(
                                `INSERT INTO imagens (produto_id, nome_arquivo, url_publica, is_principal) VALUES (?, ?, ?, 0)`,
                                [id, nomeArquivoUnico, urlPublica]
                            );
                            resolve();
                        });
                        blobStream.end(arquivo.buffer);
                    });
                }
            }

            res.redirect(`/admin/produtos`);
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao atualizar o produto.");
        }
    }

    // Deletar imagem individual do bucket e banco
    static async deletarImagem(req, res) {
        const { id } = req.params;
        const db = await model.getDb();
        const imagem = await db.get(`SELECT * FROM imagens WHERE id = ?`, [id]);

        if (imagem) {
            try {
                const storage = model.getStorage();
                const bucketName = model.getBucketName();
                await storage.bucket(bucketName).file(imagem.nome_arquivo).delete();
            } catch (e) {
                console.error("Erro ao deletar arquivo do bucket:", e);
            }
            await db.run(`DELETE FROM imagens WHERE id = ?`, [id]);
        }
        res.redirect('back');
    }

    // Deletar produto inteiro e todas as suas imagens
    static async deletarProduto(req, res) {
        const { id } = req.params;
        const dbConn = await model.getDb();
        const imagens = await dbConn.all(`SELECT * FROM imagens WHERE produto_id = ?`, [id]);

        const storage = model.getStorage();
        const bucketName = model.getBucketName();

        for (const img of imagens) {
            try {
                await storage.bucket(bucketName).file(img.nome_arquivo).delete();
            } catch (e) {
                console.error("Erro ao apagar arquivo do bucket:", e);
            }
        }

        await dbConn.run(`DELETE FROM imagens WHERE produto_id = ?`, [id]);
        await dbConn.run(`DELETE FROM produtos WHERE id = ?`, [id]);

        res.redirect('/admin/produtos');
    }
}

module.exports = ProdutoController;