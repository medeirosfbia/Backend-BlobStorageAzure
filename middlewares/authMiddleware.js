const jwt = require('jsonwebtoken');
const { buscarUsuario } = require('../services/authService');

async function autenticarUsuario(req, res, next) {
    const authHeader = req.headers.authorization;
    const [tipo, token] = authHeader ? authHeader.split(' ') : [];

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Token de autenticação não informado ou formato inválido.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET não configurado.');
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await buscarUsuario(payload.idUsuario);

        if (!usuario) {
            return res.status(401).json({ message: 'Usuário não autorizado.' });
        }

        req.usuario = payload;
        next();
    } catch (error) {
        if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
            console.error('Erro ao validar usuário:', error);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

module.exports = autenticarUsuario;