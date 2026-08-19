require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const containerName = process.env.AZURE_CONTAINER_NAME;

if (!accountName || !containerName) {
    throw new Error("As variáveis de ambiente do Azure não foram configuradas.");
}

// Cria a credencial segura (Passwordless)
const credential = new DefaultAzureCredential();

// Conecta ao Blob Storage
const blobUrl = `https://${accountName}.blob.core.windows.net`;
const blobServiceClient = new BlobServiceClient(blobUrl, credential);
const containerClient = blobServiceClient.getContainerClient(containerName);

module.exports = {
    containerClient,
    credential,
    accountName,
    containerName
};