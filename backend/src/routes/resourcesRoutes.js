const express = require('express');
const router = express.Router();
const {
    listarRecursos,
    obtenerRecurso,
    crearRecurso,
    actualizarRecurso,
    eliminarRecurso,
    cambiarEstado
} = require('../controllers/resourcesController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas públicas (usuarios autenticados)
router.get('/', listarRecursos);
router.get('/:id', obtenerRecurso);

// Rutas solo para administradores
router.post('/', esAdmin, crearRecurso);
router.put('/:id', esAdmin, actualizarRecurso);
router.delete('/:id', esAdmin, eliminarRecurso);
router.patch('/:id/estado', esAdmin, cambiarEstado);

module.exports = router;