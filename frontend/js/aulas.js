const API_URL = 'http://localhost:3000/api';
let aulasData = [];
let esAdmin = false;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = usuario.nombre;

// Verificar si es admin
    esAdmin = usuario.rol === 'ADMIN';

// Ocultar menú de usuarios, logs y botones si no es admin
    if (!esAdmin) {
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

    // Cargar aulas
    await cargarAulas();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnNuevaAula').addEventListener('click', abrirModalNueva);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('formAula').addEventListener('submit', guardarAula);
    document.getElementById('filtroModulo').addEventListener('change', filtrarAulas);
    document.getElementById('filtroEstado').addEventListener('change', filtrarAulas);
});

// Cargar todas las aulas
async function cargarAulas() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            aulasData = data.data;
            mostrarAulas(aulasData);
            cargarFiltroModulos();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las aulas');
    }
}

// Mostrar aulas en el grid
function mostrarAulas(aulas) {
    const grid = document.getElementById('aulasGrid');

    if (aulas.length === 0) {
        grid.innerHTML = '<p>No hay aulas registradas</p>';
        return;
    }

    grid.innerHTML = aulas.map(aula => `
        <div class="aula-card ${aula.estado.toLowerCase()}" onclick="verDetalle(${aula.id})">
            <h3>${aula.nombre}</h3>
            <p class="modulo">${aula.modulo}</p>
            <span class="aula-status ${aula.estado.toLowerCase()}">${aula.estado}</span>
            ${aula.estado === 'Ocupada' && aula.ocupado_por_nombre ?
        `<p class="ocupado-info">Ocupado por: ${aula.ocupado_por_nombre}</p>` : ''}
            ${esAdmin ? `
                <div class="actions" onclick="event.stopPropagation()">
                    <button class="btn-small btn-qr" onclick="verQR(${aula.id}, '${aula.qr_url}')">Ver QR</button>
                    <button class="btn-small btn-edit" onclick="editarAula(${aula.id})">Editar</button>
                    <button class="btn-small btn-delete" onclick="eliminarAula(${aula.id})">Eliminar</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Cargar módulos en el filtro
function cargarFiltroModulos() {
    const modulos = [...new Set(aulasData.map(a => a.modulo))];
    const select = document.getElementById('filtroModulo');

    modulos.forEach(modulo => {
        const option = document.createElement('option');
        option.value = modulo;
        option.textContent = modulo;
        select.appendChild(option);
    });
}

// Filtrar aulas
function filtrarAulas() {
    const filtroModulo = document.getElementById('filtroModulo').value;
    const filtroEstado = document.getElementById('filtroEstado').value;

    let aulasFiltradas = aulasData;

    if (filtroModulo) {
        aulasFiltradas = aulasFiltradas.filter(a => a.modulo === filtroModulo);
    }

    if (filtroEstado) {
        aulasFiltradas = aulasFiltradas.filter(a => a.estado === filtroEstado);
    }

    mostrarAulas(aulasFiltradas);
}

// Abrir modal para nueva aula
function abrirModalNueva() {
    document.getElementById('modalTitle').textContent = 'Nueva Aula';
    document.getElementById('formAula').reset();
    document.getElementById('formAula').dataset.id = '';
    document.getElementById('modalAula').style.display = 'block';
}

// Editar aula
async function editarAula(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/rooms/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const aula = data.data;
            document.getElementById('modalTitle').textContent = 'Editar Aula';
            document.getElementById('nombre').value = aula.nombre;
            document.getElementById('modulo').value = aula.modulo;
            document.getElementById('formAula').dataset.id = id;
            document.getElementById('modalAula').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el aula');
    }
}

// Guardar aula (crear o actualizar)
async function guardarAula(e) {
    e.preventDefault();

    const id = document.getElementById('formAula').dataset.id;
    const nombre = document.getElementById('nombre').value;
    const modulo = document.getElementById('modulo').value;
    const token = localStorage.getItem('token');

    try {
        const url = id ? `${API_URL}/rooms/${id}` : `${API_URL}/rooms`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre,
                modulo,
                estado: 'Libre',
                ocupado_por: null
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModal();
            await cargarAulas();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el aula');
    }
}

// Eliminar aula
async function eliminarAula(id) {
    if (!confirm('¿Estás seguro de eliminar esta aula?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarAulas();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el aula');
    }
}

// Ver código QR
function verQR(id, qrUrl) {
    if (!qrUrl) {
        alert('No hay código QR disponible para esta aula');
        return;
    }

    // Crear modal para mostrar el QR
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="text-align: center;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Código QR del Aula</h2>
            <img src="${qrUrl}" alt="QR Code" style="max-width: 300px; margin: 20px auto;">
            <button class="btn-primary" onclick="descargarQR('${qrUrl}')">Descargar QR</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Descargar QR
function descargarQR(qrUrl) {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'aula-qr.png';
    link.click();
}

// Ver detalle del aula
function verDetalle(id) {
    window.location.href = `aula.html?id=${id}`;
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalAula').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}