const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { verificarToken, esAdmin } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);

// Ruta de prueba protegida
router.get('/perfil', verificarToken, (req, res) => {
    res.json({
        success: true,
        message: 'Acceso autorizado',
        usuario: req.usuario
    });
});

// Ruta de prueba solo para admin
router.get('/admin-only', verificarToken, esAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Eres administrador',
        usuario: req.usuario
    });
});

module.exports = router;