const express = require('express');
const router = express.Router();
const {
    listarDanos,
    obtenerDano,
    crearDano,
    eliminarDano,
    upload
} = require('../controllers/damagesController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas públicas (usuarios autenticados)
router.get('/', listarDanos);
router.get('/:id', obtenerDano);
router.post('/', upload.single('foto'), crearDano);

// Solo admin puede eliminar
router.delete('/:id', esAdmin, eliminarDano);

module.exports = router;