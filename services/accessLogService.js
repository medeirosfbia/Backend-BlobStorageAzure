const crypto = require('crypto');
const { accessTableClient } = require('../config/azure');

const DEFAULT_LOCATION = 'Portal Web';

function normalizarLocal(idLocal) {
    return String(idLocal || 'local')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 80) || 'local';
}

function criarRowKey(data, acao, nomeArquivo = '') {
    const invertedTimestamp = String(Number.MAX_SAFE_INTEGER - data.getTime()).padStart(16, '0');
    const identificador = nomeArquivo ? `${acao}_${nomeArquivo}` : acao;
    return `${invertedTimestamp}_${normalizarLocal(identificador)}_${crypto.randomUUID()}`;
}

async function registrarAcao({
    idUsuario,
    acao,
    nomeArquivo = null,
    idLocal = DEFAULT_LOCATION,
    data = new Date()
}) {
    if (!idUsuario || !acao) {
        throw new Error('Usuário e ação são obrigatórios para registrar o log.');
    }

    await accessTableClient.createTable();

    const entidade = {
        partitionKey: idUsuario,
        rowKey: criarRowKey(data, acao, nomeArquivo),
        idUsuario,
        nomeLocal: idLocal,
        acao,
        dataHora: data.toISOString()
    };

    if (nomeArquivo) entidade.nomeArquivo = nomeArquivo;

    await accessTableClient.createEntity(entidade);
    return entidade;
}

async function registrarAcesso({ idUsuario, idLocal = DEFAULT_LOCATION, data = new Date() }) {
    return registrarAcao({ idUsuario, idLocal, acao: 'Entrar', data });
}

async function listarHistorico({ idUsuario, admin = false, dias = 30 }) {
    const filtro = admin
        ? undefined
        : `PartitionKey eq '${String(idUsuario).replace(/'/g, "''")}'`;
    
    const days_in_milliseconds = dias * 24 * 60 * 60 * 1000;
    const limite = admin ? null : Date.now() - days_in_milliseconds;
    const historico = [];
    const opcoes = filtro ? { queryOptions: { filter: filtro } } : undefined;

    for await (const entidade of accessTableClient.listEntities(opcoes)) {
        if (!admin && (!entidade.dataHora || Date.parse(entidade.dataHora) < limite)) continue;
        historico.push({
            idUsuario: entidade.partitionKey,
            nomeLocal: entidade.nomeLocal,
            acao: entidade.acao,
            nomeArquivo: entidade.nomeArquivo || entidade.nomearquivo || null,
            dataHora: entidade.dataHora,
            rowKey: entidade.rowKey
        });
    }

    return historico;
}

module.exports = {
    registrarAcao,
    registrarAcesso,
    listarHistorico,
    criarRowKey
};
