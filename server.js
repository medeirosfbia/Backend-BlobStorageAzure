// Carrega as variáveis secretas do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();

// Permite receber requisições em formato JSON e libera o CORS para o Front-end
app.use(cors());
app.use(express.json());

// Configura o Multer para guardar o arquivo temporariamente na memória RAM (memoryStorage)
// Assim enviamos direto pro Azure sem precisar salvar no HD do seu computador
// const upload = multer({ storage: multer.memoryStorage() });

// Configuração mais segura do Multer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // Limita o tamanho do ficheiro a 5MB
    },
    fileFilter: (req, file, cb) => {
        // Aceita apenas imagens e PDFs
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de ficheiro não suportado. Envia apenas imagens ou PDFs.'));
        }
    }
});

// Pegando as configurações do arquivo .env
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_CONTAINER_NAME;

// Conectando ao Azure
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// ==========================================
// ROTA 1: UPLOAD DE ARQUIVO (/api/upload)
// ==========================================
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }

        // Pega a extensão do arquivo (ex: .pdf, .png)
        const extension = path.extname(req.file.originalname);

        // Pega o nome original do arquivo SEM a extensão
        const nomeOriginalSemExtensao = path.parse(req.file.originalname).name;
        
        // Pega o nome customizado que o usuário digitou, ou usa "arquivo" como padrão
        const customName = req.body.customName || nomeOriginalSemExtensao;
        
        // Cria um nome único usando o nome customizado + a data de agora em milissegundos
        const blobName = `${customName}_${Date.now()}${extension}`;
        
        // Prepara o cliente do Blob para este arquivo específico
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Faz o upload do arquivo da memória para o Azure
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype } // Garante que imagem abra como imagem, pdf como pdf, etc
        });

        res.status(200).json({ message: 'Upload feito com sucesso no Azure!', blobName });
    } catch (error) {
        console.error("Erro no upload: ", error);
        res.status(500).json({ message: 'Erro interno ao fazer upload.' });
    }
});

// ==========================================
// ROTA 2: LISTAR ARQUIVOS (/api/files)
// ==========================================
app.get('/api/files', async (req, res) => {
    try {
        const filesList = [];
        
        // O loop varre todos os arquivos que estão dentro do seu container no Azure
        for await (const blob of containerClient.listBlobsFlat()) {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            
            // Verifica se a extensão do arquivo é uma imagem
            const isImage = blob.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

            filesList.push({
                name: blob.name,
                url: blockBlobClient.url, // O link público do arquivo
                isImage: isImage
            });
        }
        
        // Devolve a lista para o Vue.js
        res.status(200).json(filesList);
    } catch (error) {
        console.error("Erro ao listar arquivos: ", error);
        res.status(500).json({ message: 'Erro ao listar arquivos.' });
    }
});

// Define a porta onde o servidor vai rodar e inicia
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});