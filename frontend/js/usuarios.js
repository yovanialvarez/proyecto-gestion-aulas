const API_URL = 'http://localhost:3000/api';
let usuariosData = [];

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return;
    }

    // Verificar que sea administrador
    if (usuario.rol !== 'ADMIN') {
        alert('Acceso denegado. Solo administradores.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = usuario.nombre;

    // Cargar usuarios
    await cargarUsuarios();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalNuevo);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('formUsuario').addEventListener('submit', guardarUsuario);
    document.getElementById('filtroRol').addEventListener('change', filtrarUsuarios);
    document.getElementById('buscarUsuario').addEventListener('input', filtrarUsuarios);
});

// Cargar todos los usuarios
async function cargarUsuarios() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            usuariosData = data.data;
            mostrarUsuarios(usuariosData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los usuarios');
    }
}

// Mostrar usuarios en la tabla
function mostrarUsuarios(usuarios) {
    const tbody = document.getElementById('usuariosTableBody');

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td>${usuario.id}</td>
            <td>${usuario.nombre}</td>
            <td>${usuario.email}</td>
            <td><span class="role-badge ${usuario.rol.toLowerCase()}">${usuario.rol}</span></td>
            <td>${usuario.telefono || '-'}</td>
            <td>${formatearFecha(usuario.creado_en)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit-table" onclick="editarUsuario(${usuario.id})">Editar</button>
                    <button class="btn-icon btn-delete-table" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filtrar usuarios
function filtrarUsuarios() {
    const filtroRol = document.getElementById('filtroRol').value;
    const busqueda = document.getElementById('buscarUsuario').value.toLowerCase();

    let usuariosFiltrados = usuariosData;

    if (filtroRol) {
        usuariosFiltrados = usuariosFiltrados.filter(u => u.rol === filtroRol);
    }

    if (busqueda) {
        usuariosFiltrados = usuariosFiltrados.filter(u =>
            u.nombre.toLowerCase().includes(busqueda) ||
            u.email.toLowerCase().includes(busqueda)
        );
    }

    mostrarUsuarios(usuariosFiltrados);
}

// Abrir modal para nuevo usuario
function abrirModalNuevo() {
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('formUsuario').reset();
    document.getElementById('formUsuario').dataset.id = '';
    document.getElementById('password').required = true;
    document.getElementById('passwordHelp').textContent = 'Mínimo 6 caracteres';
    document.getElementById('modalUsuario').style.display = 'block';
}

// Editar usuario
async function editarUsuario(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/users/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const usuario = data.data;
            document.getElementById('modalTitle').textContent = 'Editar Usuario';
            document.getElementById('nombre').value = usuario.nombre;
            document.getElementById('email').value = usuario.email;
            document.getElementById('password').value = '';
            document.getElementById('password').required = false;
            document.getElementById('passwordHelp').textContent = 'Dejar en blanco para mantener la contraseña actual';
            document.getElementById('rol').value = usuario.rol;
            document.getElementById('telefono').value = usuario.telefono || '';
            document.getElementById('formUsuario').dataset.id = id;
            document.getElementById('modalUsuario').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el usuario');
    }
}

// Guardar usuario (crear o actualizar)
async function guardarUsuario(e) {
    e.preventDefault();

    const id = document.getElementById('formUsuario').dataset.id;
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;
    const telefono = document.getElementById('telefono').value;
    const token = localStorage.getItem('token');

    // Validar contraseña al crear
    if (!id && password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
        const url = id ? `${API_URL}/users/${id}` : `${API_URL}/users`;
        const method = id ? 'PUT' : 'POST';

        const body = { nombre, email, rol, telefono };

        // Solo incluir password si se proporcionó
        if (password) {
            body.password = password;
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModal();
            await cargarUsuarios();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el usuario');
    }
}

// Eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarUsuarios();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el usuario');
    }
}

// Formatear fecha
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

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalUsuario').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}