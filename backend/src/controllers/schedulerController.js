const db = require('../config/database');

// Completar automáticamente reservas que ya pasaron
const completarReservasVencidas = async () => {
    try {
        const ahora = new Date();
        const fechaActual = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
        const horaActual = ahora.toTimeString().split(' ')[0]; // HH:MM:SS

        // Buscar reservas activas que ya pasaron
        const [reservasVencidas] = await db.query(`
      SELECT r.*, ro.id as room_id
      FROM reservations r
      INNER JOIN rooms ro ON r.room_id = ro.id
      WHERE r.estado = 'Activa'
      AND (
        r.fecha < ? 
        OR (r.fecha = ? AND r.hora_fin < ?)
      )
    `, [fechaActual, fechaActual, horaActual]);

        console.log(`Encontradas ${reservasVencidas.length} reservas vencidas`);

        // Completar cada reserva
        for (const reserva of reservasVencidas) {
            // Cambiar estado a Completada
            await db.query(
                'UPDATE reservations SET estado = ? WHERE id = ?',
                ['Completada', reserva.id]
            );

            // Verificar si hay otras reservas activas para esta aula
            const [otrasReservas] = await db.query(
                'SELECT COUNT(*) as total FROM reservations WHERE room_id = ? AND estado = ? AND id != ?',
                [reserva.room_id, 'Activa', reserva.id]
            );

            // Si no hay otras reservas activas, liberar el aula
            if (otrasReservas[0].total === 0) {
                await db.query(
                    'UPDATE rooms SET estado = ?, ocupado_por = ? WHERE id = ?',
                    ['Libre', null, reserva.room_id]
                );
                console.log(`✓ Aula ${reserva.room_id} liberada`);
            }

            // Registrar en logs
            await db.query(
                'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
                [null, 'AUTO_COMPLETAR', 'reservations', reserva.id, `Reserva completada automáticamente`]
            );
        }

        return {
            success: true,
            completadas: reservasVencidas.length
        };
    } catch (error) {
        console.error('Error al completar reservas vencidas:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Endpoint manual para ejecutar el proceso
const ejecutarLiberacionManual = async (req, res) => {
    try {
        const resultado = await completarReservasVencidas();
        res.json(resultado);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al liberar aulas'
        });
    }
};

module.exports = {
    completarReservasVencidas,
    ejecutarLiberacionManual
};