const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads/damages';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'damage-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
});

// Listar todos los daños
const listarDanos = async (req, res) => {
    try {
        const { resource_id } = req.query;

        let query = `
            SELECT d.*,
                   r.tipo as recurso_tipo, r.codigo as recurso_codigo,
                   ro.nombre as aula_nombre, ro.modulo as aula_modulo,
                   u.nombre as usuario_nombre, u.email as usuario_email
            FROM damages d
                     INNER JOIN resources r ON d.resource_id = r.id
                     INNER JOIN rooms ro ON r.aula_id = ro.id
                     INNER JOIN users u ON d.user_id = u.id
            WHERE 1=1
        `;

        let params = [];

        if (resource_id) {
            query += ' AND d.resource_id = ?';
            params.push(resource_id);
        }

        query += ' ORDER BY d.creado_en DESC';

        const [danos] = await db.query(query, params);

        res.json({
            success: true,
            data: danos
        });
    } catch (error) {
        console.error('Error al listar daños:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los daños'
        });
    }
};

// Obtener un daño por ID
const obtenerDano = async (req, res) => {
    try {
        const { id } = req.params;

        const [danos] = await db.query(`
            SELECT d.*,
                   r.tipo as recurso_tipo, r.codigo as recurso_codigo,
                   ro.nombre as aula_nombre, ro.modulo as aula_modulo,
                   u.nombre as usuario_nombre, u.email as usuario_email
            FROM damages d
                     INNER JOIN resources r ON d.resource_id = r.id
                     INNER JOIN rooms ro ON r.aula_id = ro.id
                     INNER JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        `, [id]);

        if (danos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Daño no encontrado'
            });
        }

        res.json({
            success: true,
            data: danos[0]
        });
    } catch (error) {
        console.error('Error al obtener daño:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el daño'
        });
    }
};

// Crear un reporte de daño
const crearDano = async (req, res) => {
    try {
        const { resource_id, descripcion } = req.body;
        const user_id = req.usuario.id;
        const foto_url = req.file ? `/uploads/damages/${req.file.filename}` : null;

        if (!resource_id || !descripcion) {
            return res.status(400).json({
                success: false,
                message: 'Recurso y descripción son requeridos'
            });
        }

        // Verificar que el recurso existe
        const [recursoExiste] = await db.query('SELECT * FROM resources WHERE id = ?', [resource_id]);
        if (recursoExiste.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado'
            });
        }

        // Insertar daño
        const [result] = await db.query(
            'INSERT INTO damages (resource_id, user_id, descripcion, foto_url) VALUES (?, ?, ?, ?)',
            [resource_id, user_id, descripcion, foto_url]
        );

        // Cambiar estado del recurso a Dañado
        await db.query(
            'UPDATE resources SET estado = ? WHERE id = ?',
            ['Dañado', resource_id]
        );

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [user_id, 'REPORTAR_DAÑO', 'damages', result.insertId, `Daño reportado en recurso: ${recursoExiste[0].tipo} - ${recursoExiste[0].codigo}`]
        );

        res.status(201).json({
            success: true,
            message: 'Daño reportado exitosamente',
            data: {
                id: result.insertId,
                resource_id,
                descripcion,
                foto_url
            }
        });
    } catch (error) {
        console.error('Error al crear daño:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reportar el daño'
        });
    }
};

// Eliminar un reporte de daño (solo admin)
const eliminarDano = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el daño existe
        const [danoExistente] = await db.query('SELECT * FROM damages WHERE id = ?', [id]);

        if (danoExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Daño no encontrado'
            });
        }

        // Eliminar imagen si existe
        if (danoExistente[0].foto_url) {
            const imagePath = '.' + danoExistente[0].foto_url;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Eliminar daño
        await db.query('DELETE FROM damages WHERE id = ?', [id]);

        // Registrar en logs
        await db.query(
            'INSERT INTO logs (usuario_id, accion, tabla, registro_id, detalles) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, 'ELIMINAR', 'damages', id, `Reporte de daño eliminado`]
        );

        res.json({
            success: true,
            message: 'Reporte de daño eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar daño:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el daño'
        });
    }
};

module.exports = {
    listarDanos,
    obtenerDano,
    crearDano,
    eliminarDano,
    upload
};