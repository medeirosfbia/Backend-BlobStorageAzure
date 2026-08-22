const bcrypt = require('bcrypt');
const { TableClient } = require('@azure/data-tables');
const { connectionString } = require('../config/azure'); 

const authTableClient = TableClient.fromConnectionString(connectionString, "PUsers");
const accessTableClient = TableClient.fromConnectionString(connectionString, "AccessLogs");

exports.registrarEntrada = async (req, res) => {
    try {
        // Recebe a senha atual e a nova (se for enviada pelo front-end)
        const { idUsuario, pwdUsuario, novaSenha } = req.body;

        if (!idUsuario || !pwdUsuario) {
            return res.status(400).json({ message: 'ID e Senha são obrigatórios.' });
        }

        let user;
        try {
            user = await authTableClient.getEntity("Access", idUsuario);
        } catch (authError) {
            return res.status(401).json({ message: 'Acesso negado: Usuário não cadastrado.' });
        }

        // Verifica se a senha no banco começa com "$2" (Padrão do Bcrypt)
        const isHashed = user.Password && String(user.Password).startsWith('$2');

        if (!isHashed) {
            // PRIMEIRO LOGIN: Verifica em texto plano
            if (String(pwdUsuario) !== String(user.Password)) {
                return res.status(401).json({ message: 'Acesso negado: Senha incorreta.' });
            }

            // Se a senha estiver certa, mas ele ainda não digitou a nova senha:
            if (!novaSenha) {
                return res.status(200).json({ 
                    primeiroLogin: true, 
                    message: 'Primeiro acesso detectado. Por favor, crie uma nova senha segura.' 
                });
            }

            // Se ele enviou a nova senha, vamos fazer o hash e atualizar a tabela
            const saltRounds = 10;
            user.Password = await bcrypt.hash(novaSenha, saltRounds);
            
            // Atualiza a entidade no Azure Table Storage
            await authTableClient.updateEntity(user, "Replace");

        } else {
            // LOGIN NORMAL: Verifica usando o Bcrypt
            const match = await bcrypt.compare(String(pwdUsuario), user.Password);
            if (!match) {
                return res.status(401).json({ message: 'Acesso negado: Senha incorreta.' });
            }
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

        res.status(200).json({ message: `Bem-vindo(a), ${idUsuario}!`, idUsuario, primeiroLogin: false });

    } catch (error) {
        console.error("Erro no acesso:", error);
        res.status(500).json({ message: 'Erro interno ao validar o acesso.' });
    }
};