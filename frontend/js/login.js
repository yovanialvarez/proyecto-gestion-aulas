const API_URL = 'http://localhost:3000/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    // Limpiar mensaje de error previo
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Guardar token y datos del usuario en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            // Redirigir al dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Mostrar error
            errorMessage.textContent = data.message;
            errorMessage.classList.add('show');
        }

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'Error al conectar con el servidor';
        errorMessage.classList.add('show');
    }
});