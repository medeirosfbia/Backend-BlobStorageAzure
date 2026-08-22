const { accessTableClient } = require('../config/azure');
const {
    buscarUsuario,
    validarSenha,
    atualizarSenha,
    gerarToken
} = require('../services/authService');

exports.registrarEntrada = async (req, res) => {
    try {
        // Recebe a senha atual e a nova (se for enviada pelo front-end)
        const { idUsuario, pwdUsuario, novaSenha } = req.body;

        if (!idUsuario || !pwdUsuario) {
            return res.status(400).json({ message: 'ID e Senha são obrigatórios.' });
        }

        const user = await buscarUsuario(idUsuario);
        if (!user) {
            return res.status(401).json({ message: 'Acesso negado: Usuário não cadastrado.' });
        }

        if (!(await validarSenha(user, pwdUsuario))) {
            return res.status(401).json({ message: 'Acesso negado: Senha incorreta.' });
        }

        const isHashed = String(user.Password).startsWith('$2');
        if (!isHashed && !novaSenha) {
            return res.status(200).json({
                primeiroLogin: true,
                message: 'Primeiro acesso detectado. Por favor, crie uma nova senha segura.'
            });
        }

        if (!isHashed && novaSenha) {
            if (String(novaSenha).length < 6) {
                return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
            }
            await atualizarSenha(user, novaSenha);
        }

        // PASSO B: REGISTRAR O LOG NO ACCESSLOGS
        await accessTableClient.createTable(); 
        const invertedTimestamp = String(Number.MAX_SAFE_INTEGER - Date.now());

        await accessTableClient.createEntity({
            partitionKey: idUsuario, 
            rowKey: invertedTimestamp,
            nomeLocal: "Portal Web (Antes do Upload)",
            acao: "Entrada",
            dataHora: new Date().toISOString()
        });

        const token = gerarToken(user);
        res.status(200).json({ message: `Bem-vindo(a), ${idUsuario}!`, idUsuario, token, primeiroLogin: false });

    } catch (error) {
        console.error("Erro no acesso:", error);
        res.status(500).json({ message: 'Erro interno ao validar o acesso.' });
    }
};