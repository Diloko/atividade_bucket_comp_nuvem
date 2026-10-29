const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Configuração da chave de serviço do Grupo F
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../sa-grupo-f-key.json');
const storage = new Storage();
const bucketName = 'fatec-2026-grupo-f';

let dbPromise = open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
});

async function initDb() {
    const db = await dbPromise;
    await db.exec(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            descricao TEXT,
            preco REAL
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS imagens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            nome_arquivo TEXT,
            url_publica TEXT,
            is_principal INTEGER,
            FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
        )
    `);
}
initDb();

module.exports = {
    async getDb() {
        return await dbPromise;
    },
    getStorage() {
        return storage;
    },
    getBucketName() {
        return bucketName;
    }
};