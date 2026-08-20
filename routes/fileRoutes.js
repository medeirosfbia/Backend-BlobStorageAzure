const express = require('express');
const multer = require('multer');

const fileController = require('../controllers/fileController');

const router = express.Router();

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

// ==========================================
// ROTA 1: UPLOAD DE ARQUIVO (/api/upload)
// ==========================================
router.post('/upload', upload.single('file'), fileController.uploadFile);

// ==========================================
// ROTA 2: LISTAR ARQUIVOS (/api/files)
// ==========================================
router.get('/files', fileController.listFiles);

// ==========================================
// ROTA 3: BUSCAR LOGS (/api/logs)
// ==========================================
router.get('/logs', fileController.getLogs);

// ==========================================
// ROTA 4: DELETAR ARQUIVO (/api/files/:filename)
// ==========================================
router.delete('/files/:filename', fileController.deleteFile);

module.exports = router;
