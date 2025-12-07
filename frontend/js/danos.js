const API_URL = 'http://localhost:3000/api';
let danosData = [];
let recursosData = [];
let esAdmin = false;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return;
    }

    esAdmin = usuario.rol === 'ADMIN';

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = usuario.nombre;

// Ocultar menú de usuarios y logs si no es admin
    if (!esAdmin) {
        const menuUsuarios = document.getElementById('menuUsuarios');
        const menuLogs = document.getElementById('menuLogs');

        if (menuUsuarios) {
            menuUsuarios.style.display = 'none';
        }

        if (menuLogs) {
            menuLogs.style.display = 'none';
        }
    }

    // Cargar datos
    await cargarRecursos();
    await cargarDanos();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnReportarDano').addEventListener('click', abrirModalNuevo);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarDetalle').addEventListener('click', cerrarModalDetalle);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('closeDetalle').addEventListener('click', cerrarModalDetalle);
    document.getElementById('formDano').addEventListener('submit', reportarDano);
    document.getElementById('buscarDano').addEventListener('input', filtrarDanos);
    document.getElementById('foto').addEventListener('change', previsualizarImagen);
});

// Cargar recursos
async function cargarRecursos() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/resources`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            recursosData = data.data;
            cargarSelectRecursos();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cargar recursos en el select
function cargarSelectRecursos() {
    const select = document.getElementById('resourceId');

    recursosData.forEach(recurso => {
        const option = document.createElement('option');
        option.value = recurso.id;
        option.textContent = `${recurso.tipo} - ${recurso.codigo} (${recurso.aula_nombre})`;
        select.appendChild(option);
    });
}

// Cargar daños
async function cargarDanos() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/damages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            danosData = data.data;
            mostrarDanos(danosData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los daños');
    }
}

// Mostrar daños en el grid
function mostrarDanos(danos) {
    const grid = document.getElementById('danosGrid');

    if (danos.length === 0) {
        grid.innerHTML = '<p>No hay reportes de daños registrados</p>';
        return;
    }

    grid.innerHTML = danos.map(dano => `
        <div class="dano-card" onclick="verDetalle(${dano.id})">
            <h3>${dano.recurso_tipo} - ${dano.recurso_codigo}</h3>
            <div class="recurso-info">
                📍 ${dano.aula_nombre} - ${dano.aula_modulo}
            </div>
            ${dano.foto_url ? `
                <img src="${API_URL.replace('/api', '')}${dano.foto_url}" alt="Foto del daño" class="foto-preview">
            ` : ''}
            <p class="descripcion">${truncarTexto(dano.descripcion, 100)}</p>
            <p class="reportado-por">👤 Reportado por: ${dano.usuario_nombre}</p>
            <p class="fecha-reporte">📅 ${formatearFecha(dano.creado_en)}</p>
            ${esAdmin ? `
                <div class="actions" onclick="event.stopPropagation()">
                    <button class="btn-small btn-delete" onclick="eliminarDano(${dano.id})">Eliminar</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Filtrar daños
function filtrarDanos() {
    const busqueda = document.getElementById('buscarDano').value.toLowerCase();

    let danosFiltrados = danosData;

    if (busqueda) {
        danosFiltrados = danosFiltrados.filter(d =>
            d.recurso_tipo.toLowerCase().includes(busqueda) ||
            d.recurso_codigo.toLowerCase().includes(busqueda) ||
            d.descripcion.toLowerCase().includes(busqueda)
        );
    }

    mostrarDanos(danosFiltrados);
}

// Abrir modal para nuevo reporte
function abrirModalNuevo() {
    document.getElementById('formDano').reset();
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('modalDano').style.display = 'block';
}

// Previsualizar imagen
function previsualizarImagen(e) {
    const file = e.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            document.getElementById('previewImage').src = e.target.result;
            document.getElementById('previewContainer').style.display = 'block';
        }

        reader.readAsDataURL(file);
    } else {
        document.getElementById('previewContainer').style.display = 'none';
    }
}

// Reportar daño
async function reportarDano(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('resource_id', document.getElementById('resourceId').value);
    formData.append('descripcion', document.getElementById('descripcion').value);

    const fotoInput = document.getElementById('foto');
    if (fotoInput.files[0]) {
        formData.append('foto', fotoInput.files[0]);
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/damages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModal();
            await cargarDanos();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al reportar el daño');
    }
}

// Ver detalle del daño
async function verDetalle(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/damages/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const dano = data.data;
            const detalleContent = document.getElementById('detalleContent');

            detalleContent.innerHTML = `
                <div class="detalle-dano">
                    ${dano.foto_url ? `
                        <img src="${API_URL.replace('/api', '')}${dano.foto_url}" alt="Foto del daño" class="foto-grande">
                    ` : ''}
                    
                    <div class="info-section">
                        <h4>Información del Recurso</h4>
                        <div class="info-item">
                            <label>Tipo:</label>
                            <span>${dano.recurso_tipo}</span>
                        </div>
                        <div class="info-item">
                            <label>Código:</label>
                            <span>${dano.recurso_codigo}</span>
                        </div>
                        <div class="info-item">
                            <label>Ubicación:</label>
                            <span>${dano.aula_nombre} - ${dano.aula_modulo}</span>
                        </div>
                    </div>
                    
                    <div class="descripcion-completa">
                        <h4>Descripción del Daño</h4>
                        <p>${dano.descripcion}</p>
                    </div>
                    
                    <div class="info-section">
                        <h4>Información del Reporte</h4>
                        <div class="info-item">
                            <label>Reportado por:</label>
                            <span>${dano.usuario_nombre} (${dano.usuario_email})</span>
                        </div>
                        <div class="info-item">
                            <label>Fecha:</label>
                            <span>${formatearFecha(dano.creado_en)}</span>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalDetalle').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle');
    }
}

// Eliminar daño (solo admin)
async function eliminarDano(id) {
    if (!confirm('¿Estás seguro de eliminar este reporte de daño?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/damages/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarDanos();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el daño');
    }
}

// Utilidades
function truncarTexto(texto, longitud) {
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Cerrar modales
function cerrarModal() {
    document.getElementById('modalDano').style.display = 'none';
}

function cerrarModalDetalle() {
    document.getElementById('modalDetalle').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}