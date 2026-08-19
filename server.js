require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

// Permite receber requisições em formato JSON e libera o CORS para o Front-end
app.use(cors());
app.use(express.json());


// Rota GET para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.send('Servidor rodando! Acesse /api/files para listar arquivos ou /api/upload para enviar arquivos.');
});

app.use('/api', fileRoutes);

// Define a porta onde o servidor vai rodar e inicia
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});