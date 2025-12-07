const express = require('express');
const router = express.Router();
const {
    listarLogs,
    obtenerEstadisticas,
    obtenerLog
} = require('../controllers/logsController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación y ser admin
router.use(verificarToken);
router.use(esAdmin);

router.get('/', listarLogs);
router.get('/estadisticas', obtenerEstadisticas);
router.get('/:id', obtenerLog);

module.exports = router;