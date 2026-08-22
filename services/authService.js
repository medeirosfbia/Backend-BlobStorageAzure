const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { usersTableClient } = require('../config/azure');

function gerarToken(usuario) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não configurado.');
    }

    return jwt.sign(
        { idUsuario: usuario.idUsuario },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
}

async function buscarUsuario(idUsuario) {
    try {
        const usuario = await usersTableClient.getEntity('Access', idUsuario);
        return { ...usuario, idUsuario };
    } catch (error) {
        if (error.statusCode === 404) return null;
        throw error;
    }
}

async function validarSenha(usuario, senha) {
    const senhaArmazenada = usuario.Password;
    if (!senhaArmazenada) return false;

    if (String(senhaArmazenada).startsWith('$2')) {
        return bcrypt.compare(String(senha), String(senhaArmazenada));
    }

    return String(senha) === String(senhaArmazenada);
}

async function atualizarSenha(usuario, novaSenha) {
    usuario.Password = await bcrypt.hash(String(novaSenha), 12);
    await usersTableClient.updateEntity(usuario, 'Replace');
}

module.exports = {
    buscarUsuario,
    validarSenha,
    atualizarSenha,
    gerarToken
};