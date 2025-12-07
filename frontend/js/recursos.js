const API_URL = 'http://localhost:3000/api';
let recursosData = [];
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

    // Cargar datos
    await cargarAulas();
    await cargarRecursos();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnNuevoRecurso').addEventListener('click', abrirModalNuevo);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarEstado').addEventListener('click', cerrarModalEstado);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('closeEstado').addEventListener('click', cerrarModalEstado);
    document.getElementById('formRecurso').addEventListener('submit', guardarRecurso);
    document.getElementById('formEstado').addEventListener('submit', cambiarEstadoRecurso);
    document.getElementById('filtroAula').addEventListener('change', filtrarRecursos);
    document.getElementById('filtroEstado').addEventListener('change', filtrarRecursos);
    document.getElementById('buscarRecurso').addEventListener('input', filtrarRecursos);
    document.getElementById('nuevoEstado').addEventListener('change', toggleAulaDestino);
});

// Cargar aulas
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
            cargarSelectAulas();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cargar aulas en los selects
function cargarSelectAulas() {
    const selectAula = document.getElementById('aulaId');
    const selectDestino = document.getElementById('aulaDestino');
    const filtroAula = document.getElementById('filtroAula');

    aulasData.forEach(aula => {
        // Select del formulario
        const option1 = document.createElement('option');
        option1.value = aula.id;
        option1.textContent = `${aula.nombre} - ${aula.modulo}`;
        selectAula.appendChild(option1);

        // Select de destino
        const option2 = document.createElement('option');
        option2.value = aula.id;
        option2.textContent = `${aula.nombre} - ${aula.modulo}`;
        selectDestino.appendChild(option2);

        // Filtro
        const option3 = document.createElement('option');
        option3.value = aula.id;
        option3.textContent = `${aula.nombre} - ${aula.modulo}`;
        filtroAula.appendChild(option3);
    });
}

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
            mostrarRecursos(recursosData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los recursos');
    }
}

// Mostrar recursos en el grid
function mostrarRecursos(recursos) {
    const grid = document.getElementById('recursosGrid');

    if (recursos.length === 0) {
        grid.innerHTML = '<p>No hay recursos registrados</p>';
        return;
    }

    grid.innerHTML = recursos.map(recurso => `
        <div class="recurso-card ${recurso.estado.toLowerCase()}">
            <span class="recurso-estado-badge recurso-estado ${recurso.estado.toLowerCase()}">${recurso.estado}</span>
            <h3>${recurso.tipo}</h3>
            <p class="codigo">Código: ${recurso.codigo}</p>
            <div class="aula-info">
                <strong>Ubicación:</strong> ${recurso.aula_nombre} - ${recurso.aula_modulo}
            </div>
            ${esAdmin ? `
                <div class="actions">
                    <button class="btn-small btn-estado" onclick="abrirModalEstado(${recurso.id})">Cambiar Estado</button>
                    <button class="btn-small btn-edit" onclick="editarRecurso(${recurso.id})">Editar</button>
                    <button class="btn-small btn-delete" onclick="eliminarRecurso(${recurso.id})">Eliminar</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Filtrar recursos
function filtrarRecursos() {
    const filtroAula = document.getElementById('filtroAula').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    const busqueda = document.getElementById('buscarRecurso').value.toLowerCase();

    let recursosFiltrados = recursosData;

    if (filtroAula) {
        recursosFiltrados = recursosFiltrados.filter(r => r.aula_id == filtroAula);
    }

    if (filtroEstado) {
        recursosFiltrados = recursosFiltrados.filter(r => r.estado === filtroEstado);
    }

    if (busqueda) {
        recursosFiltrados = recursosFiltrados.filter(r =>
            r.tipo.toLowerCase().includes(busqueda) ||
            r.codigo.toLowerCase().includes(busqueda)
        );
    }

    mostrarRecursos(recursosFiltrados);
}

// Abrir modal para nuevo recurso
function abrirModalNuevo() {
    document.getElementById('modalTitle').textContent = 'Nuevo Recurso';
    document.getElementById('formRecurso').reset();
    document.getElementById('formRecurso').dataset.id = '';
    document.getElementById('modalRecurso').style.display = 'block';
}

// Editar recurso
async function editarRecurso(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/resources/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const recurso = data.data;
            document.getElementById('modalTitle').textContent = 'Editar Recurso';
            document.getElementById('aulaId').value = recurso.aula_id;
            document.getElementById('tipo').value = recurso.tipo;
            document.getElementById('codigo').value = recurso.codigo;
            document.getElementById('estado').value = recurso.estado;
            document.getElementById('formRecurso').dataset.id = id;
            document.getElementById('modalRecurso').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el recurso');
    }
}

// Guardar recurso (crear o actualizar)
async function guardarRecurso(e) {
    e.preventDefault();

    const id = document.getElementById('formRecurso').dataset.id;
    const aula_id = document.getElementById('aulaId').value;
    const tipo = document.getElementById('tipo').value;
    const codigo = document.getElementById('codigo').value;
    const estado = document.getElementById('estado').value;
    const token = localStorage.getItem('token');

    try {
        const url = id ? `${API_URL}/resources/${id}` : `${API_URL}/resources`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ aula_id, tipo, codigo, estado })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModal();
            await cargarRecursos();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el recurso');
    }
}

// Eliminar recurso
async function eliminarRecurso(id) {
    if (!confirm('¿Estás seguro de eliminar este recurso?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/resources/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarRecursos();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el recurso');
    }
}

// Abrir modal para cambiar estado
function abrirModalEstado(id) {
    document.getElementById('formEstado').dataset.id = id;
    document.getElementById('modalEstado').style.display = 'block';
}

// Toggle aula destino
function toggleAulaDestino() {
    const estado = document.getElementById('nuevoEstado').value;
    const aulaDestinoGroup = document.getElementById('aulaDestinoGroup');

    if (estado === 'Prestado') {
        aulaDestinoGroup.style.display = 'block';
        document.getElementById('aulaDestino').required = true;
    } else {
        aulaDestinoGroup.style.display = 'none';
        document.getElementById('aulaDestino').required = false;
    }
}

// Cambiar estado del recurso
async function cambiarEstadoRecurso(e) {
    e.preventDefault();

    const id = document.getElementById('formEstado').dataset.id;
    const estado = document.getElementById('nuevoEstado').value;
    const aula_destino_id = document.getElementById('aulaDestino').value;
    const token = localStorage.getItem('token');

    try {
        const body = { estado };
        if (estado === 'Prestado' && aula_destino_id) {
            body.aula_destino_id = aula_destino_id;
        }

        const response = await fetch(`${API_URL}/resources/${id}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModalEstado();
            await cargarRecursos();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar el estado');
    }
}

// Cerrar modales
function cerrarModal() {
    document.getElementById('modalRecurso').style.display = 'none';
}

function cerrarModalEstado() {
    document.getElementById('modalEstado').style.display = 'none';
    document.getElementById('formEstado').reset();
    document.getElementById('aulaDestinoGroup').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}