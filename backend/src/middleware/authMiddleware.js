const jwt = require('jsonwebtoken');

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Agregar información del usuario al request
        req.usuario = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar rol de administrador
const esAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores.'
        });
    }
    next();
};

// Middleware para registrar actividad en logs
const registrarActividad = async (accion, entidad, entidad_id, detalle) => {
    try {
        const db = require('../config/database');

        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles, ip) VALUES (?, ?, ?, ?, ?, ?)',
            [null, accion, entidad, entidad_id, detalle, 'localhost'] // IP se puede obtener del req si es necesario
        );
    } catch (error) {
        console.error('Error al registrar actividad:', error);
    }
};

module.exports = {
    verificarToken,
    esAdmin,
    registrarActividad
};