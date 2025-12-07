const express = require('express');
const router = express.Router();
const {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} = require('../controllers/usersController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación Y ser administrador
router.use(verificarToken);
router.use(esAdmin);

router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;