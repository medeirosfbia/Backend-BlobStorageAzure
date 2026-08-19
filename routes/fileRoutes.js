const express = require('express');
const { getUploadSasToken, listFiles } = require('../controllers/fileController');

const router = express.Router();

// O front-end chama essa rota passando o nome do arquivo para pegar a URL de permissão
router.get('/upload-sas', getUploadSasToken);

// O front-end chama essa rota para listar todos os arquivos
router.get('/files', listFiles);

module.exports = router;