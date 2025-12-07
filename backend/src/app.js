const express = require('express');
const cors = require('cors');
const path = require('path')
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const roomsRoutes = require('./routes/roomsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const resourcesRoutes = require('./routes/resourcesRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const damagesRoutes = require('./routes/damagesRoutes');
const logsRoutes = require('./routes/logsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('__dirname:', __dirname);
console.log('Ruta uploads:', path.join(__dirname, '../uploads'));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/damages', damagesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});