const db = require('../config/database');
const QRCode = require('qrcode');
const { registrarActividad } = require('../middleware/authMiddleware');

// Listar todas las aulas
const listarAulas = async (req, res) => {
    try {
        const [aulas] = await db.query(`
      SELECT r.*, u.nombre as ocupado_por_nombre 
      FROM rooms r
      LEFT JOIN users u ON r.ocupado_por = u.id
      ORDER BY r.modulo, r.nombre
    `);

        res.json({
            success: true,
            data: aulas
        });
    } catch (error) {
        console.error('Error al listar aulas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las aulas'
        });
    }
};

// Obtener un aula por ID
const obtenerAula = async (req, res) => {
    try {
        const { id } = req.params;

        const [aulas] = await db.query(`
      SELECT r.*, u.nombre as ocupado_por_nombre, u.email as ocupado_por_email
      FROM rooms r
      LEFT JOIN users u ON r.ocupado_por = u.id
      WHERE r.id = ?
    `, [id]);

        if (aulas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula no encontrada'
            });
        }

        // Obtener recursos del aula
        const [recursos] = await db.query(
            'SELECT * FROM resources WHERE aula_id = ?',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...aulas[0],
                recursos
            }
        });
    } catch (error) {
        console.error('Error al obtener aula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el aula'
        });
    }
};

// Crear un aula
const crearAula = async (req, res) => {
    try {
        const { nombre, modulo } = req.body;

        if (!nombre || !modulo) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y módulo son requeridos'
            });
        }

        // Insertar aula
        const [result] = await db.query(
            'INSERT INTO rooms (nombre, modulo, estado) VALUES (?, ?, ?)',
            [nombre, modulo, 'Libre']
        );

        const aulaId = result.insertId;

        // Generar código QR
        const qrData = `Aula: ${nombre}\nMódulo: ${modulo}\nID: ${aulaId}`;
        const qrUrl = await QRCode.toDataURL(qrData);

        // Actualizar con la URL del QR
        await db.query(
            'UPDATE rooms SET qr_url = ? WHERE id = ?',
            [qrUrl, aulaId]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CREAR', 'rooms', aulaId, `Aula creada: ${nombre} - ${modulo}`]
        );

        res.status(201).json({
            success: true,
            message: 'Aula creada exitosamente',
            data: {
                id: aulaId,
                nombre,
                modulo,
                qr_url: qrUrl
            }
        });
    } catch (error) {
        console.error('Error al crear aula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el aula'
        });
    }
};

// Actualizar un aula
const actualizarAula = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, modulo, estado, ocupado_por } = req.body;

        // Verificar que el aula existe
        const [aulaExistente] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);

        if (aulaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula no encontrada'
            });
        }

        // Actualizar aula
        await db.query(
            'UPDATE rooms SET nombre = ?, modulo = ?, estado = ?, ocupado_por = ? WHERE id = ?',
            [nombre, modulo, estado, ocupado_por || null, id]
        );

        // Si cambió el estado, regenerar QR
        if (nombre !== aulaExistente[0].nombre || modulo !== aulaExistente[0].modulo) {
            const qrData = `Aula: ${nombre}\nMódulo: ${modulo}\nID: ${id}`;
            const qrUrl = await QRCode.toDataURL(qrData);

            await db.query(
                'UPDATE rooms SET qr_url = ? WHERE id = ?',
                [qrUrl, id]
            );
        }

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ACTUALIZAR', 'rooms', id, `Aula actualizada: ${nombre}`]
        );

        res.json({
            success: true,
            message: 'Aula actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar aula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el aula'
        });
    }
};

// Eliminar un aula
const eliminarAula = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el aula existe
        const [aulaExistente] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);

        if (aulaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula no encontrada'
            });
        }

        // Eliminar aula
        await db.query('DELETE FROM rooms WHERE id = ?', [id]);

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ELIMINAR', 'rooms', id, `Aula eliminada: ${aulaExistente[0].nombre}`]
        );

        res.json({
            success: true,
            message: 'Aula eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar aula:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el aula'
        });
    }
};

// Cambiar estado del aula
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, ocupado_por } = req.body;

        if (!estado || !['Libre', 'Ocupada'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Debe ser Libre u Ocupada'
            });
        }

        await db.query(
            'UPDATE rooms SET estado = ?, ocupado_por = ? WHERE id = ?',
            [estado, estado === 'Ocupada' ? ocupado_por : null, id]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CAMBIO_ESTADO', 'rooms', id, `Estado cambiado a: ${estado}`]
        );

        res.json({
            success: true,
            message: 'Estado actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado'
        });
    }
};

module.exports = {
    listarAulas,
    obtenerAula,
    crearAula,
    actualizarAula,
    eliminarAula,
    cambiarEstado
};