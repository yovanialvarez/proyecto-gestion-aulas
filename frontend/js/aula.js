const API_URL = 'http://localhost:3000/api';
let aulaActual = null;

// Verificar autenticación y cargar datos
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = usuario.nombre;

    // Ocultar menú de usuarios si no es admin
    if (usuario.rol !== 'ADMIN') {
        document.getElementById('menuUsuarios').style.display = 'none';
        document.getElementById('btnNuevoRecurso').style.display = 'none';
    }

// Ocultar menú de usuarios y logs si no es admin
    if (usuario.rol !== 'ADMIN') {
        const menuUsuarios = document.getElementById('menuUsuarios');
        const menuLogs = document.getElementById('menuLogs');

        if (menuUsuarios) {
            menuUsuarios.style.display = 'none';
        }

        if (menuLogs) {
            menuLogs.style.display = 'none';
        }

        document.getElementById('btnNuevoRecurso').style.display = 'none';
    }

    // Obtener ID del aula desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const aulaId = urlParams.get('id');

    if (!aulaId) {
        alert('ID de aula no válido');
        window.location.href = 'aulas.html';
        return;
    }

    // Cargar datos del aula
    await cargarAula(aulaId);

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnDescargarQR').addEventListener('click', descargarQR);
});

// Cargar datos del aula
async function cargarAula(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/rooms/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            aulaActual = data.data;
            mostrarAula(aulaActual);
        } else {
            alert('Error al cargar el aula');
            window.location.href = 'aulas.html';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el aula');
    }
}

// Mostrar información del aula
function mostrarAula(aula) {
    document.getElementById('aulaNombre').textContent = aula.nombre;
    document.getElementById('aulaModulo').textContent = aula.modulo;

    const estadoElement = document.getElementById('aulaEstado');
    estadoElement.textContent = aula.estado;
    estadoElement.className = `aula-status ${aula.estado.toLowerCase()}`;

    // Mostrar ocupado por si aplica
    if (aula.estado === 'Ocupada' && aula.ocupado_por_nombre) {
        document.getElementById('ocupadoContainer').style.display = 'block';
        document.getElementById('aulaOcupado').textContent = `${aula.ocupado_por_nombre} (${aula.ocupado_por_email})`;
    }

    // Mostrar QR
    if (aula.qr_url) {
        document.getElementById('aulaQR').src = aula.qr_url;
    } else {
        document.getElementById('aulaQR').style.display = 'none';
        document.getElementById('btnDescargarQR').style.display = 'none';
    }

    // Mostrar recursos
    mostrarRecursos(aula.recursos || []);
}

// Mostrar recursos
function mostrarRecursos(recursos) {
    const container = document.getElementById('recursosContainer');

    if (recursos.length === 0) {
        container.innerHTML = '<p style="color: #666;">No hay recursos registrados para esta aula</p>';
        return;
    }

    container.innerHTML = `
        <div class="recursos-list">
            ${recursos.map(recurso => `
                <div class="recurso-item">
                    <div class="recurso-info">
                        <h4>${recurso.tipo}</h4>
                        <p>Código: ${recurso.codigo}</p>
                    </div>
                    <div>
                        <span class="recurso-estado ${recurso.estado.toLowerCase()}">${recurso.estado}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Descargar QR
function descargarQR() {
    if (aulaActual && aulaActual.qr_url) {
        const link = document.createElement('a');
        link.href = aulaActual.qr_url;
        link.download = `qr-${aulaActual.nombre}.png`;
        link.click();
    }
}

// Obtener ID del aula desde la URL
function getAulaId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}