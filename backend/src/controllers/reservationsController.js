const db = require('../config/database');
const { enviarEmailReserva, enviarEmailCancelacion } = require('../services/emailService');
const { enviarNotificacionWhatsApp } = require('../services/whatsappService');


// Listar todas las reservas
const listarReservas = async (req, res) => {
    try {
        const { room_id, user_id, fecha } = req.query;

        let query = `
            SELECT r.*,
                   ro.nombre as aula_nombre, ro.modulo as aula_modulo,
                   u.nombre as usuario_nombre, u.email as usuario_email
            FROM reservations r
                     INNER JOIN rooms ro ON r.room_id = ro.id
                     INNER JOIN users u ON r.user_id = u.id
            WHERE 1=1
        `;

        let params = [];

        if (room_id) {
            query += ' AND r.room_id = ?';
            params.push(room_id);
        }

        if (user_id) {
            query += ' AND r.user_id = ?';
            params.push(user_id);
        }

        if (fecha) {
            query += ' AND r.fecha = ?';
            params.push(fecha);
        }

        query += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';

        const [reservas] = await db.query(query, params);

        res.json({
            success: true,
            data: reservas
        });
    } catch (error) {
        console.error('Error al listar reservas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las reservas'
        });
    }
};

// Obtener una reserva por ID
const obtenerReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const [reservas] = await db.query(`
            SELECT r.*,
                   ro.nombre as aula_nombre, ro.modulo as aula_modulo,
                   u.nombre as usuario_nombre, u.email as usuario_email
            FROM reservations r
                     INNER JOIN rooms ro ON r.room_id = ro.id
                     INNER JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [id]);

        if (reservas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        res.json({
            success: true,
            data: reservas[0]
        });
    } catch (error) {
        console.error('Error al obtener reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la reserva'
        });
    }
};

// Crear una reserva
const crearReserva = async (req, res) => {
    try {
        const { room_id, fecha, hora_inicio, hora_fin, grupo_whatsapp } = req.body;
        const user_id = req.usuario.id; // Usuario autenticado

        if (!room_id || !fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({
                success: false,
                message: 'Aula, fecha, hora de inicio y hora de fin son requeridos'
            });
        }

        // Verificar que el aula existe
        const [aulaExiste] = await db.query('SELECT * FROM rooms WHERE id = ?', [room_id]);
        if (aulaExiste.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula no encontrada'
            });
        }

        // Verificar que la hora de inicio sea menor que la hora de fin
        if (hora_inicio >= hora_fin) {
            return res.status(400).json({
                success: false,
                message: 'La hora de inicio debe ser menor que la hora de fin'
            });
        }

        // Verificar que no haya conflictos de horario
        const [conflictos] = await db.query(`
            SELECT * FROM reservations
            WHERE room_id = ?
              AND fecha = ?
              AND estado = 'Activa'
              AND (
                (hora_inicio <= ? AND hora_fin > ?) OR
                (hora_inicio < ? AND hora_fin >= ?) OR
                (hora_inicio >= ? AND hora_fin <= ?)
                )
        `, [room_id, fecha, hora_inicio, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin]);

        if (conflictos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una reserva en ese horario para esta aula'
            });
        }

        // Insertar reserva
        const [result] = await db.query(
            'INSERT INTO reservations (user_id, room_id, fecha, hora_inicio, hora_fin, grupo_whatsapp, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, room_id, fecha, hora_inicio, hora_fin, grupo_whatsapp || null, 'Activa']
        );

        // Cambiar estado del aula a Ocupada
        await db.query(
            'UPDATE rooms SET estado = ?, ocupado_por = ? WHERE id = ?',
            ['Ocupada', user_id, room_id]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [user_id, 'CREAR', 'reservations', result.insertId, `Reserva creada: Aula ${aulaExiste[0].nombre} - ${fecha} ${hora_inicio} a ${hora_fin}`]
        );

        // Enviar email de confirmación
        const emailData = {
            usuario_email: req.usuario.email,
            usuario_nombre: req.usuario.nombre || 'Usuario',
            aula_nombre: aulaExiste[0].nombre,
            aula_modulo: aulaExiste[0].modulo,
            fecha,
            hora_inicio,
            hora_fin,
            grupo_whatsapp
        };

        // Enviar email de forma asíncrona (no bloquear la respuesta)
        enviarEmailReserva(emailData).catch(err => {
            console.error('Error al enviar email (no crítico):', err);
        });

        // Generar notificación de WhatsApp
        const whatsappData = {
            usuario_nombre: req.usuario.nombre || 'Usuario',
            aula_nombre: aulaExiste[0].nombre,
            aula_modulo: aulaExiste[0].modulo,
            fecha,
            hora_inicio,
            hora_fin
        };

        const whatsappResult = await enviarNotificacionWhatsApp(whatsappData, 'confirmacion');

        res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: {
                id: result.insertId,
                room_id,
                fecha,
                hora_inicio,
                hora_fin,
                whatsapp_enlace: whatsappResult.enlace
            }
        });
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la reserva'
        });
    }
};

// Actualizar una reserva
const actualizarReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_id, fecha, hora_inicio, hora_fin, grupo_whatsapp, estado } = req.body;

        // Verificar que la reserva existe
        const [reservaExistente] = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);

        if (reservaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        // Verificar que el usuario sea el creador o admin
        if (reservaExistente[0].user_id !== req.usuario.id && req.usuario.rol !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar esta reserva'
            });
        }

        // Verificar hora inicio < hora fin
        if (hora_inicio && hora_fin && hora_inicio >= hora_fin) {
            return res.status(400).json({
                success: false,
                message: 'La hora de inicio debe ser menor que la hora de fin'
            });
        }

        // Verificar conflictos (excluyendo la reserva actual)
        if (room_id || fecha || hora_inicio || hora_fin) {
            const [conflictos] = await db.query(`
                SELECT * FROM reservations
                WHERE room_id = ?
                  AND fecha = ?
                  AND estado = 'Activa'
                  AND id != ?
        AND (
          (hora_inicio <= ? AND hora_fin > ?) OR
          (hora_inicio < ? AND hora_fin >= ?) OR
          (hora_inicio >= ? AND hora_fin <= ?)
        )
            `, [
                room_id || reservaExistente[0].room_id,
                fecha || reservaExistente[0].fecha,
                id,
                hora_inicio || reservaExistente[0].hora_inicio,
                hora_inicio || reservaExistente[0].hora_inicio,
                hora_fin || reservaExistente[0].hora_fin,
                hora_fin || reservaExistente[0].hora_fin,
                hora_inicio || reservaExistente[0].hora_inicio,
                hora_fin || reservaExistente[0].hora_fin
            ]);

            if (conflictos.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una reserva en ese horario para esta aula'
                });
            }
        }

        // Actualizar reserva
        await db.query(
            'UPDATE reservations SET room_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ?, grupo_whatsapp = ?, estado = ? WHERE id = ?',
            [
                room_id || reservaExistente[0].room_id,
                fecha || reservaExistente[0].fecha,
                hora_inicio || reservaExistente[0].hora_inicio,
                hora_fin || reservaExistente[0].hora_fin,
                grupo_whatsapp !== undefined ? grupo_whatsapp : reservaExistente[0].grupo_whatsapp,
                estado || reservaExistente[0].estado,
                id
            ]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ACTUALIZAR', 'reservations', id, `Reserva actualizada`]
        );

        res.json({
            success: true,
            message: 'Reserva actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la reserva'
        });
    }
};

// Cancelar una reserva
const cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la reserva existe
        const [reservaExistente] = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);

        if (reservaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        // Verificar que el usuario sea el creador o admin
        if (reservaExistente[0].user_id !== req.usuario.id && req.usuario.rol !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta reserva'
            });
        }

        // Cambiar estado a Cancelada
        await db.query('UPDATE reservations SET estado = ? WHERE id = ?', ['Cancelada', id]);

        // Liberar el aula si no hay otras reservas activas
        const [reservasActivas] = await db.query(
            'SELECT * FROM reservations WHERE room_id = ? AND estado = ? AND id != ?',
            [reservaExistente[0].room_id, 'Activa', id]
        );

        if (reservasActivas.length === 0) {
            await db.query(
                'UPDATE rooms SET estado = ?, ocupado_por = ? WHERE id = ?',
                ['Libre', null, reservaExistente[0].room_id]
            );
        }

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CANCELAR', 'reservations', id, `Reserva cancelada`]
        );

        const [aulaInfo] = await db.query('SELECT nombre FROM rooms WHERE id = ?', [reservaExistente[0].room_id]);

        const emailData = {
            usuario_email: req.usuario.email,
            usuario_nombre: req.usuario.nombre || 'Usuario',
            aula_nombre: aulaInfo[0].nombre,
            fecha: reservaExistente[0].fecha,
            hora_inicio: reservaExistente[0].hora_inicio
        };

        enviarEmailCancelacion(emailData).catch(err => {
            console.error('Error al enviar email de cancelación (no crítico):', err);
        });

        // Generar notificación WhatsApp de cancelación
        const whatsappData = {
            usuario_nombre: req.usuario.nombre || 'Usuario',
            aula_nombre: aulaInfo[0].nombre,
            fecha: reservaExistente[0].fecha,
            hora_inicio: reservaExistente[0].hora_inicio
        };

        await enviarNotificacionWhatsApp(whatsappData, 'cancelacion');

        res.json({
            success: true,
            message: 'Reserva cancelada exitosamente',
            data: {
                id: result.insertId,
                room_id,
                fecha,
                hora_inicio,
                hora_fin,
                whatsapp_enlace: whatsappResult.enlace
            }
        });
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar la reserva'
        });
    }
};

// Completar una reserva
const completarReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const [reservaExistente] = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);

        if (reservaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }

        // Cambiar estado a Completada
        await db.query('UPDATE reservations SET estado = ? WHERE id = ?', ['Completada', id]);

        // Liberar el aula
        await db.query(
            'UPDATE rooms SET estado = ?, ocupado_por = ? WHERE id = ?',
            ['Libre', null, reservaExistente[0].room_id]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'COMPLETAR', 'reservations', id, `Reserva completada`]
        );

        res.json({
            success: true,
            message: 'Reserva completada exitosamente'
        });
    } catch (error) {
        console.error('Error al completar reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al completar la reserva'
        });
    }
};

module.exports = {
    listarReservas,
    obtenerReserva,
    crearReserva,
    actualizarReserva,
    cancelarReserva,
    completarReserva
};