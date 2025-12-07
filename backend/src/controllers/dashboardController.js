const db = require('../config/database');

// Obtener estadísticas generales del dashboard
const obtenerEstadisticas = async (req, res) => {
    try {
        // Total de aulas
        const [totalAulas] = await db.query('SELECT COUNT(*) as total FROM rooms');

        // Aulas por estado
        const [aulasPorEstado] = await db.query(`
      SELECT estado, COUNT(*) as total
      FROM rooms
      GROUP BY estado
    `);

        // Total de recursos
        const [totalRecursos] = await db.query('SELECT COUNT(*) as total FROM resources');

        // Recursos por estado
        const [recursosPorEstado] = await db.query(`
      SELECT estado, COUNT(*) as total
      FROM resources
      GROUP BY estado
    `);

        // Total de usuarios
        const [totalUsuarios] = await db.query('SELECT COUNT(*) as total FROM users');

        // Usuarios por rol
        const [usuariosPorRol] = await db.query(`
      SELECT rol, COUNT(*) as total
      FROM users
      GROUP BY rol
    `);

        // Reservas activas
        const [reservasActivas] = await db.query(`
      SELECT COUNT(*) as total
      FROM reservations
      WHERE estado = 'Activa'
    `);

        // Reservas por estado
        const [reservasPorEstado] = await db.query(`
      SELECT estado, COUNT(*) as total
      FROM reservations
      GROUP BY estado
    `);

        // Daños reportados (totales)
        const [totalDanos] = await db.query('SELECT COUNT(*) as total FROM damages');

        // Últimas 5 reservas
        const [ultimasReservas] = await db.query(`
      SELECT r.*, 
             ro.nombre as aula_nombre,
             u.nombre as usuario_nombre
      FROM reservations r
      INNER JOIN rooms ro ON r.room_id = ro.id
      INNER JOIN users u ON r.user_id = u.id
      ORDER BY r.creado_en DESC
      LIMIT 5
    `);

        // Últimos 5 daños reportados
        const [ultimosDanos] = await db.query(`
      SELECT d.*, 
             r.tipo as recurso_tipo, r.codigo as recurso_codigo,
             u.nombre as usuario_nombre
      FROM damages d
      INNER JOIN resources r ON d.resource_id = r.id
      INNER JOIN users u ON d.user_id = u.id
      ORDER BY d.creado_en DESC
      LIMIT 5
    `);

        // Actividad reciente (últimas 10 acciones del log)
        const [actividadReciente] = await db.query(`
      SELECT l.*, u.nombre as usuario_nombre
      FROM logs l
      LEFT JOIN users u ON l.usuario_id = u.id
      ORDER BY l.creado_en DESC
      LIMIT 10
    `);

        res.json({
            success: true,
            data: {
                aulas: {
                    total: totalAulas[0].total,
                    porEstado: aulasPorEstado
                },
                recursos: {
                    total: totalRecursos[0].total,
                    porEstado: recursosPorEstado
                },
                usuarios: {
                    total: totalUsuarios[0].total,
                    porRol: usuariosPorRol
                },
                reservas: {
                    activas: reservasActivas[0].total,
                    porEstado: reservasPorEstado
                },
                danos: {
                    total: totalDanos[0].total
                },
                recientes: {
                    reservas: ultimasReservas,
                    danos: ultimosDanos,
                    actividad: actividadReciente
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las estadísticas'
        });
    }
};

module.exports = {
    obtenerEstadisticas
};