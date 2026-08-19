const path = require('path');
const { containerClient, credential, accountName, containerName } = require('../config/azure');
const { generateBlobSASQueryParameters, BlobSASPermissions, BlobServiceClient } = require('@azure/storage-blob');

// Função para gerar SAS com Delegação de Usuário (Máxima Segurança)
async function getSecureSasUrl(blobName, permissionType = "r") {
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
    
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.valueOf() + 60 * 60 * 1000); // Válido por 1 hora

    // Chave temporária baseada na sua identidade
    const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissionType),
        startsOn,
        expiresOn,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, userDelegationKey, accountName).toString();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    return `${blockBlobClient.url}?${sasToken}`;
}

// 1. Rota para gerar permissão de UPLOAD
const getUploadSasToken = async (req, res) => {
    try {
        const { fileName } = req.query;
        if (!fileName) {
            return res.status(400).json({ message: 'O nome do arquivo é obrigatório.' });
        }
        
        const extension = path.extname(fileName);
        const nomeOriginalSemExtensao = path.parse(fileName).name;
        // Limpa caracteres estranhos do nome
        const sanitizedName = nomeOriginalSemExtensao.replace(/[^a-zA-Z0-9_-]/g, '_');
        const blobName = `${sanitizedName}_${Date.now()}${extension}`;

        // "w" = Permissão de Write (Escrita)
        const uploadUrl = await getSecureSasUrl(blobName, "w");

        return res.status(200).json({ uploadUrl, blobName });
    } catch (error) {
        console.error("Erro ao gerar URL de upload:", error);
        return res.status(500).json({ message: 'Erro interno ao gerar permissão.' });
    }
};

// 2. Rota para LISTAR os arquivos
const listFiles = async (req, res) => {
    try {
        const filesList = [];
        
        for await (const blob of containerClient.listBlobsFlat()) {
            const isImage = blob.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
            
            // "r" = Permissão de Read (Leitura visualização/download)
            const secureUrl = await getSecureSasUrl(blob.name, "r");

            filesList.push({
                name: blob.name,
                url: secureUrl,
                isImage: isImage
            });
        }
        
        return res.status(200).json(filesList);
    } catch (error) {
        console.error("Erro ao listar arquivos: ", error);
        return res.status(500).json({ message: 'Erro ao listar arquivos.' });
    }
};

module.exports = {
    getUploadSasToken,
    listFiles
};