const express = require('express');
const router = express.Router();
const {
    listarAulas,
    obtenerAula,
    crearAula,
    actualizarAula,
    eliminarAula,
    cambiarEstado
} = require('../controllers/roomsController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas públicas (usuarios autenticados)
router.get('/', listarAulas);
router.get('/:id', obtenerAula);

// Rutas solo para administradores
router.post('/', esAdmin, crearAula);
router.put('/:id', esAdmin, actualizarAula);
router.delete('/:id', esAdmin, eliminarAula);
router.patch('/:id/estado', esAdmin, cambiarEstado);

module.exports = router;