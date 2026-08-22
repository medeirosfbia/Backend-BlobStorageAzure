require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const accessRoutes = require('./routes/accessRoutes');

const app = express();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado.');
}

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());


// Rota GET para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.send('Servidor rodando! Acesse /api/files para listar arquivos ou /api/upload para enviar arquivos.');
});

app.use('/api/access', accessRoutes);
app.use('/api', fileRoutes);

app.use((error, req, res, next) => {
    if (error instanceof require('multer').MulterError || error.message?.includes('Tipo de ficheiro')) {
        return res.status(400).json({ message: error.message || 'Arquivo inválido.' });
    }
    console.error('Erro não tratado:', error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
});

// Define a porta onde o servidor vai rodar e inicia
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});