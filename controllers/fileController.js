const path = require('path');
const { containerClient } = require('../config/azure');

const uploadFile = async (req, res) => {
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
}

const listFiles = async (req, res) => {
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
}

module.exports = {
    uploadFile,
    listFiles
};