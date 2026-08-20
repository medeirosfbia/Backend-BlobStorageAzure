// Carrega as variáveis secretas do arquivo .env
require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { TableClient} = require('@azure/data-tables')

// Pegando as configurações do arquivo .env
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_CONTAINER_NAME;
const tableName = process.env.TABLE_NAME;

if (!connectionString || !containerName) {
    throw new Error("As variáveis de ambiente do Azure não foram configuradas corretamente.");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

const tableClient = TableClient.fromConnectionString(connectionString, tableName);

async function initTable() {
    try {
        await tableClient.createTable();
        console.log(`Tabela '${tableName}' criada com sucesso.`);
    }
    catch (error) {
        if (error.statusCode === 409) {
            console.log(`Tabela '${tableName}' já existe.`);
        } else {
            console.error("Erro ao criar a tabela:", error);
        }
    }
}
initTable();


module.exports = {
    containerClient,
    tableClient,
    connectionString
};