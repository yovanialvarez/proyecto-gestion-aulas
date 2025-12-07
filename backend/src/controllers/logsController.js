const db = require('../config/database');

// Listar todos los logs
const listarLogs = async (req, res) => {
    try {
        const { usuario_id, tabla, accion, fecha_inicio, fecha_fin, limit } = req.query;

        let query = `
      SELECT l.*, 
             u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs l
      LEFT JOIN users u ON l.usuario_id = u.id
      WHERE 1=1
    `;

        let params = [];

        if (usuario_id) {
            query += ' AND l.usuario_id = ?';
            params.push(usuario_id);
        }

        if (tabla) {
            query += ' AND l.tabla = ?';
            params.push(tabla);
        }

        if (accion) {
            query += ' AND l.accion = ?';
            params.push(accion);
        }

        if (fecha_inicio) {
            query += ' AND DATE(l.creado_en) >= ?';
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            query += ' AND DATE(l.creado_en) <= ?';
            params.push(fecha_fin);
        }

        query += ' ORDER BY l.creado_en DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        } else {
            query += ' LIMIT 100'; // Por defecto últimos 100
        }

        const [logs] = await db.query(query, params);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Error al listar logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los logs'
        });
    }
};

// Obtener estadísticas de logs
const obtenerEstadisticas = async (req, res) => {
    try {
        // Total de acciones por tipo
        const [accionesPorTipo] = await db.query(`
      SELECT accion, COUNT(*) as total
      FROM logs
      GROUP BY accion
      ORDER BY total DESC
    `);

        // Acciones por tabla
        const [accionesPorTabla] = await db.query(`
      SELECT tabla, COUNT(*) as total
      FROM logs
      WHERE tabla IS NOT NULL
      GROUP BY tabla
      ORDER BY total DESC
    `);

        // Usuarios más activos
        const [usuariosMasActivos] = await db.query(`
      SELECT u.nombre, u.email, COUNT(*) as total_acciones
      FROM logs l
      INNER JOIN users u ON l.usuario_id = u.id
      GROUP BY l.usuario_id
      ORDER BY total_acciones DESC
      LIMIT 10
    `);

        // Actividad de los últimos 7 días
        const [actividadReciente] = await db.query(`
      SELECT DATE(creado_en) as fecha, COUNT(*) as total
      FROM logs
      WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(creado_en)
      ORDER BY fecha DESC
    `);

        res.json({
            success: true,
            data: {
                accionesPorTipo,
                accionesPorTabla,
                usuariosMasActivos,
                actividadReciente
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};

// Obtener un log por ID
const obtenerLog = async (req, res) => {
    try {
        const { id } = req.params;

        const [logs] = await db.query(`
      SELECT l.*, 
             u.nombre as usuario_nombre, u.email as usuario_email
      FROM logs l
      LEFT JOIN users u ON l.usuario_id = u.id
      WHERE l.id = ?
    `, [id]);

        if (logs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Log no encontrado'
            });
        }

        res.json({
            success: true,
            data: logs[0]
        });
    } catch (error) {
        console.error('Error al obtener log:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el log'
        });
    }
};

module.exports = {
    listarLogs,
    obtenerEstadisticas,
    obtenerLog
};