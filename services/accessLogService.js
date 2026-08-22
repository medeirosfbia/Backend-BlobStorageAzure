const crypto = require('crypto');
const { accessTableClient } = require('../config/azure');

const ACCESS_LOCATION = 'Portal Web';
const ACCESS_ACTION = 'Entrada';

function normalizarLocal(idLocal) {
    return String(idLocal || 'local')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 80) || 'local';
}

function criarRowKey(data, idLocal) {
    const invertedTimestamp = String(Number.MAX_SAFE_INTEGER - data.getTime()).padStart(16, '0');
    return `${invertedTimestamp}_${normalizarLocal(idLocal)}_${crypto.randomUUID()}`;
}

async function registrarAcesso({ idUsuario, idLocal = ACCESS_LOCATION, acao = ACCESS_ACTION, data = new Date() }) {
    await accessTableClient.createTable();

    const entidade = {
        partitionKey: idUsuario,
        rowKey: criarRowKey(data, idLocal),
        idUsuario,
        nomeLocal: idLocal,
        acao,
        dataHora: data.toISOString()
    };

    await accessTableClient.createEntity(entidade);
    return entidade;
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
            dataHora: entidade.dataHora,
            rowKey: entidade.rowKey
        });
    }

    return historico;
}

module.exports = {
    registrarAcesso,
    listarHistorico,
    criarRowKey
};
