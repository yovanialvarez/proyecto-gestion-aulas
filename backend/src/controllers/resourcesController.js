const db = require('../config/database');

// Listar todos los recursos
const listarRecursos = async (req, res) => {
    try {
        const { aula_id } = req.query;

        let query = `
      SELECT r.*, ro.nombre as aula_nombre, ro.modulo as aula_modulo
      FROM resources r
      INNER JOIN rooms ro ON r.aula_id = ro.id
    `;

        let params = [];

        if (aula_id) {
            query += ' WHERE r.aula_id = ?';
            params.push(aula_id);
        }

        query += ' ORDER BY r.creado_en DESC';

        const [recursos] = await db.query(query, params);

        res.json({
            success: true,
            data: recursos
        });
    } catch (error) {
        console.error('Error al listar recursos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los recursos'
        });
    }
};

// Obtener un recurso por ID
const obtenerRecurso = async (req, res) => {
    try {
        const { id } = req.params;

        const [recursos] = await db.query(`
      SELECT r.*, ro.nombre as aula_nombre, ro.modulo as aula_modulo
      FROM resources r
      INNER JOIN rooms ro ON r.aula_id = ro.id
      WHERE r.id = ?
    `, [id]);

        if (recursos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado'
            });
        }

        res.json({
            success: true,
            data: recursos[0]
        });
    } catch (error) {
        console.error('Error al obtener recurso:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el recurso'
        });
    }
};

// Crear un recurso
const crearRecurso = async (req, res) => {
    try {
        const { aula_id, tipo, codigo, estado } = req.body;

        if (!aula_id || !tipo || !codigo) {
            return res.status(400).json({
                success: false,
                message: 'Aula, tipo y código son requeridos'
            });
        }

        // Verificar que el aula existe
        const [aulaExiste] = await db.query('SELECT * FROM rooms WHERE id = ?', [aula_id]);
        if (aulaExiste.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula no encontrada'
            });
        }

        // Verificar que el código no esté duplicado
        const [codigoExiste] = await db.query('SELECT * FROM resources WHERE codigo = ?', [codigo]);
        if (codigoExiste.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El código ya está en uso'
            });
        }

        // Insertar recurso
        const [result] = await db.query(
            'INSERT INTO resources (aula_id, tipo, codigo, estado, origin_room_id) VALUES (?, ?, ?, ?, ?)',
            [aula_id, tipo, codigo, estado || 'Activo', aula_id]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CREAR', 'resources', result.insertId, `Recurso creado: ${tipo} - ${codigo} en aula ${aulaExiste[0].nombre}`]
        );

        res.status(201).json({
            success: true,
            message: 'Recurso creado exitosamente',
            data: {
                id: result.insertId,
                aula_id,
                tipo,
                codigo,
                estado: estado || 'Activo'
            }
        });
    } catch (error) {
        console.error('Error al crear recurso:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el recurso'
        });
    }
};

// Actualizar un recurso
const actualizarRecurso = async (req, res) => {
    try {
        const { id } = req.params;
        const { aula_id, tipo, codigo, estado } = req.body;

        // Verificar que el recurso existe
        const [recursoExistente] = await db.query('SELECT * FROM resources WHERE id = ?', [id]);

        if (recursoExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado'
            });
        }

        // Verificar código duplicado (excluyendo el actual)
        if (codigo && codigo !== recursoExistente[0].codigo) {
            const [codigoExiste] = await db.query('SELECT * FROM resources WHERE codigo = ? AND id != ?', [codigo, id]);
            if (codigoExiste.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El código ya está en uso'
                });
            }
        }

        // Actualizar recurso
        await db.query(
            'UPDATE resources SET aula_id = ?, tipo = ?, codigo = ?, estado = ? WHERE id = ?',
            [
                aula_id || recursoExistente[0].aula_id,
                tipo || recursoExistente[0].tipo,
                codigo || recursoExistente[0].codigo,
                estado || recursoExistente[0].estado,
                id
            ]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ACTUALIZAR', 'resources', id, `Recurso actualizado: ${tipo || recursoExistente[0].tipo} - ${codigo || recursoExistente[0].codigo}`]
        );

        res.json({
            success: true,
            message: 'Recurso actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar recurso:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el recurso'
        });
    }
};

// Eliminar un recurso
const eliminarRecurso = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el recurso existe
        const [recursoExistente] = await db.query('SELECT * FROM resources WHERE id = ?', [id]);

        if (recursoExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado'
            });
        }

        // Eliminar recurso
        await db.query('DELETE FROM resources WHERE id = ?', [id]);

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ELIMINAR', 'resources', id, `Recurso eliminado: ${recursoExistente[0].tipo} - ${recursoExistente[0].codigo}`]
        );

        res.json({
            success: true,
            message: 'Recurso eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar recurso:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el recurso'
        });
    }
};

// Cambiar estado de un recurso
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, aula_destino_id } = req.body;

        if (!estado || !['Activo', 'Dañado', 'Prestado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Debe ser Activo, Dañado o Prestado'
            });
        }

        const [recursoExistente] = await db.query('SELECT * FROM resources WHERE id = ?', [id]);

        if (recursoExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado'
            });
        }

        // Si es prestado, cambiar de aula
        if (estado === 'Prestado' && aula_destino_id) {
            await db.query(
                'UPDATE resources SET estado = ?, aula_id = ? WHERE id = ?',
                [estado, aula_destino_id, id]
            );
        } else {
            await db.query(
                'UPDATE resources SET estado = ? WHERE id = ?',
                [estado, id]
            );
        }

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'CAMBIO_ESTADO', 'resources', id, `Estado del recurso ${recursoExistente[0].codigo} cambiado a: ${estado}`]
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
    listarRecursos,
    obtenerRecurso,
    crearRecurso,
    actualizarRecurso,
    eliminarRecurso,
    cambiarEstado
};