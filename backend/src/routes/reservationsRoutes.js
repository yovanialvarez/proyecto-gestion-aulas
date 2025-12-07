const express = require('express');
const router = express.Router();
const {
    listarReservas,
    obtenerReserva,
    crearReserva,
    actualizarReserva,
    cancelarReserva,
    completarReserva
} = require('../controllers/reservationsController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas públicas (usuarios autenticados)
router.get('/', listarReservas);
router.get('/:id', obtenerReserva);
router.post('/', crearReserva);
router.put('/:id', actualizarReserva);
router.patch('/:id/cancelar', cancelarReserva);

// Solo admin puede completar reservas
router.patch('/:id/completar', esAdmin, completarReserva);

module.exports = router;