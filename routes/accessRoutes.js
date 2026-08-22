const express = require('express');
const { registrarEntrada, listarHistorico } = require('../controllers/accessController');
const autenticarUsuario = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', registrarEntrada);
router.get('/history', autenticarUsuario, listarHistorico);

module.exports = router;