const path = require('path');
const crypto = require('crypto');
const { containerClient, tableClient } = require('../config/azure');
const { registrarAcao } = require('../services/accessLogService');

function obterProprietario(metadata = {}) {
    return metadata.userId || metadata.userid || null;
}

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }

        const extension = path.extname(req.file.originalname).toLowerCase();

        // Pega o nome original do arquivo SEM a extensão
        const nomeOriginalSemExtensao = path.parse(req.file.originalname).name;
        
        // Pega o nome customizado que o usuário digitou, ou usa "arquivo" como padrão
        const customName = (req.body.customName || nomeOriginalSemExtensao)
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 80) || 'arquivo';
        
        // Cria um nome único usando o nome customizado + a data de agora em milissegundos
        const owner = req.usuario.idUsuario;
        const ownerPrefix = owner.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
        const blobName = `${ownerPrefix}_${crypto.randomUUID()}_${customName}${extension}`;
        
        // Prepara o cliente do Blob para este arquivo específico
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Faz o upload do arquivo da memória para o Azure
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype },
            metadata: { userId: owner }
        });

        //Registro do Log no Table Storage
        const entidadeLog = {
            partitionKey: "Uploads",
            rowKey: String(Date.now()),
            nomeArquivo: blobName,
            tamanhoBytes: req.file.size,
            tipoMime: req.file.mimetype,
            acao: "Upload",
            dataHora: new Date().toISOString()
        };

        await tableClient.createEntity(entidadeLog);
        await registrarAcao({
            idUsuario: owner,
            acao: 'Upload',
            nomeArquivo: blobName,
            idLocal: 'Azure Blob Storage'
        });

        res.status(200).json({ message: 'Upload feito com sucesso no Azure!', blobName });
    } catch (error) {
        console.error("Erro no upload: ", error);
        res.status(500).json({ message: 'Erro interno ao fazer upload.' });
    }
}

exports.listFiles = async (req, res) => {
    try {
        const filesList = [];
        const visualizarTodos = req.query.scope === 'all' && req.usuario.admin === true;
        
        // O loop varre todos os arquivos que estão dentro do seu container no Azure
        for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
            const proprietario = obterProprietario(blob.metadata);
            if (!visualizarTodos && proprietario !== req.usuario.idUsuario) continue;
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            
            // Verifica se a extensão do arquivo é uma imagem
            const isImage = blob.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

            filesList.push({
                name: blob.name,
                url: blockBlobClient.url, // O link público do arquivo
                isImage: isImage,
                idUsuario: proprietario
            });
        }
        
        // Devolve a lista para o Vue.js
        res.status(200).json(filesList);
    } catch (error) {
        console.error("Erro ao listar arquivos: ", error);
        res.status(500).json({ message: 'Erro ao listar arquivos.' });
    }
}

exports.deleteFile = async (req, res) => {
    try {
        const blobName = req.params.filename;

        if (!blobName || blobName === 'undefined') {
            return res.status(400).json({ error: 'Nome do arquivo inválido ou não fornecido.' });
        }

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const properties = await blockBlobClient.getProperties();

        if (obterProprietario(properties.metadata) !== req.usuario.idUsuario) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir este arquivo.' });
        }

        //Registra Log
        const blobSize = properties.contentLength || 0;
        const blobType = properties.blobType || 'unknown';

        const entidadeLog = {
            partitionKey: "Deletions",
            rowKey: String(Date.now()),
            nomeArquivo: blobName,
            tamanhoBytes: blobSize,
            tipoMime: blobType,
            acao: "Delete",
            dataHora: new Date().toISOString()
        };
        
        // Deleta o arquivo do Azure
        await blockBlobClient.deleteIfExists();

        await tableClient.createEntity(entidadeLog);
        await registrarAcao({
            idUsuario: req.usuario.idUsuario,
            acao: 'Delete',
            nomeArquivo: blobName,
            idLocal: 'Azure Blob Storage'
        });

        res.status(200).json({ message: 'Arquivo deletado com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar arquivo: ", error);
        res.status(500).json({ message: 'Erro ao deletar arquivo.' });
    }
}

exports.getLogs = async (req, res) => {
    try {
        const logs = [];
        const entities = tableClient.listEntities();

        for await (const entity of entities) {
            logs.push(entity);
        }

        res.status(200).json(logs);
    } catch (error) {
        console.error("Erro ao buscar logs: ", error);
        res.status(500).json({ message: 'Erro ao buscar logs.' });
    }
}