// Carrega as variáveis secretas do arquivo .env
require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');

// Pegando as configurações do arquivo .env
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_CONTAINER_NAME;

if (!connectionString || !containerName) {
    throw new Error("As variáveis de ambiente do Azure não foram configuradas corretamente.");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

module.exports = {
    containerClient,
    connectionString
};