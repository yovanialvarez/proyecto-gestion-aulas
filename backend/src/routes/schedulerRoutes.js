const express = require('express');
const router = express.Router();
const { ejecutarLiberacionManual } = require('../controllers/schedulerController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Solo admin puede ejecutar manualmente
router.post('/liberar-aulas', verificarToken, esAdmin, ejecutarLiberacionManual);

module.exports = router;