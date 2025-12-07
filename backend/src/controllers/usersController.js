const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Listar todos los usuarios
const listarUsuarios = async (req, res) => {
    try {
        const [usuarios] = await db.query(`
      SELECT id, nombre, email, rol, telefono, creado_en, actualizado_en
      FROM users
      ORDER BY creado_en DESC
    `);

        res.json({
            success: true,
            data: usuarios
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los usuarios'
        });
    }
};

// Obtener un usuario por ID
const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const [usuarios] = await db.query(`
      SELECT id, nombre, email, rol, telefono, creado_en, actualizado_en
      FROM users
      WHERE id = ?
    `, [id]);

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: usuarios[0]
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el usuario'
        });
    }
};

// Crear un usuario
const crearUsuario = async (req, res) => {
    try {
        const { nombre, email, password, rol, telefono } = req.body;

        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Validar que la contraseña tenga al menos 6 caracteres
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar si el usuario ya existe
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [result] = await db.query(
            'INSERT INTO users (nombre, email, password, rol, telefono) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hashedPassword, rol || 'USUARIO', telefono || null]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CREAR', 'users', result.insertId, `Usuario creado: ${nombre} (${email})`]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: result.insertId,
                nombre,
                email,
                rol: rol || 'USUARIO'
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el usuario'
        });
    }
};

// Actualizar un usuario
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, password, rol, telefono } = req.body;

        // Verificar que el usuario existe
        const [usuarioExistente] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

        if (usuarioExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Validar email si se está cambiando
        if (email && email !== usuarioExistente[0].email) {
            const [emailExiste] = await db.query('SELECT * FROM users WHERE email = ? AND id != ?', [email, id]);
            if (emailExiste.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está en uso'
                });
            }
        }

        // Preparar datos para actualizar
        let updateQuery = 'UPDATE users SET nombre = ?, email = ?, rol = ?, telefono = ?';
        let updateParams = [
            nombre || usuarioExistente[0].nombre,
            email || usuarioExistente[0].email,
            rol || usuarioExistente[0].rol,
            telefono !== undefined ? telefono : usuarioExistente[0].telefono
        ];

        // Si se proporciona una nueva contraseña, hashearla
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(id);

        // Actualizar usuario
        await db.query(updateQuery, updateParams);

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ACTUALIZAR', 'users', id, `Usuario actualizado: ${nombre || usuarioExistente[0].nombre}`]
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el usuario'
        });
    }
};

// Eliminar un usuario
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const [usuarioExistente] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

        if (usuarioExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir que el admin se elimine a sí mismo
        if (parseInt(id) === req.usuario.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        // Eliminar usuario
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ELIMINAR', 'users', id, `Usuario eliminado: ${usuarioExistente[0].nombre}`]
        );

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el usuario'
        });
    }
};

module.exports = {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
};