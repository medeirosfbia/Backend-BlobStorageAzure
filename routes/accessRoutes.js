const express = require('express');
const { registrarEntrada } = require('../controllers/accessController');

const router = express.Router();

router.post('/login', registrarEntrada);

module.exports = router;