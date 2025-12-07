const express = require('express');
const router = express.Router();
const { obtenerEstadisticas } = require('../controllers/dashboardController');
const { verificarToken } = require('../middleware/authMiddleware');

// Requiere autenticación
router.use(verificarToken);

router.get('/estadisticas', obtenerEstadisticas);

module.exports = router;