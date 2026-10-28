const express = require('express');
const produtoRoutes = require('./routes/produtoRoutes');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotas principais
app.use('/', produtoRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});