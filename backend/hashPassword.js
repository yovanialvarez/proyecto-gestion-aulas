const bcrypt = require('bcryptjs');

const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Contraseña hasheada:', hash);
        console.log('\nEjecuta este SQL en MySQL:');
        console.log(`INSERT INTO users (nombre, email, password, rol, telefono) VALUES ('Admin', 'admin@test.com', '${hash}', 'ADMIN', '12345678');`);
    }
});