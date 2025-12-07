const API_URL = 'http://localhost:3000/api';
let reservasData = [];
let aulasData = [];
let usuarioActual = null;
let esAdmin = false;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'index.html';
        return;
    }

    usuarioActual = usuario;
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

    // Establecer fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').min = hoy;

    // Cargar datos
    await cargarAulas();
    await cargarReservas();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnNuevaReserva').addEventListener('click', abrirModalNueva);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarDetalle').addEventListener('click', cerrarModalDetalle);
    document.querySelector('.close').addEventListener('click', cerrarModal);
    document.getElementById('closeDetalle').addEventListener('click', cerrarModalDetalle);
    document.getElementById('formReserva').addEventListener('submit', guardarReserva);
    document.getElementById('filtroAula').addEventListener('change', filtrarReservas);
    document.getElementById('filtroEstado').addEventListener('change', filtrarReservas);
    document.getElementById('filtroFecha').addEventListener('change', filtrarReservas);
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
    const selectAula = document.getElementById('roomId');
    const filtroAula = document.getElementById('filtroAula');

    // Solo aulas libres para el formulario
    const aulasLibres = aulasData.filter(a => a.estado === 'Libre');

    aulasLibres.forEach(aula => {
        const option = document.createElement('option');
        option.value = aula.id;
        option.textContent = `${aula.nombre} - ${aula.modulo}`;
        selectAula.appendChild(option);
    });

    // Todas las aulas para el filtro
    aulasData.forEach(aula => {
        const option = document.createElement('option');
        option.value = aula.id;
        option.textContent = `${aula.nombre} - ${aula.modulo}`;
        filtroAula.appendChild(option);
    });
}

// Cargar reservas
async function cargarReservas() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/reservations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            reservasData = data.data;
            mostrarReservas(reservasData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las reservas');
    }
}

// Mostrar reservas en la tabla
function mostrarReservas(reservas) {
    const tbody = document.getElementById('reservasTableBody');

    if (reservas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay reservas registradas</td></tr>';
        return;
    }

    tbody.innerHTML = reservas.map(reserva => `
        <tr>
            <td>${reserva.id}</td>
            <td>${reserva.aula_nombre} - ${reserva.aula_modulo}</td>
            <td>${reserva.usuario_nombre}</td>
            <td>${formatearFecha(reserva.fecha)}</td>
            <td>${formatearHora(reserva.hora_inicio)}</td>
            <td>${formatearHora(reserva.hora_fin)}</td>
            <td><span class="estado-badge ${reserva.estado.toLowerCase()}">${reserva.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit-table" onclick="verDetalle(${reserva.id})">Ver</button>
                    ${puedeModificar(reserva) && reserva.estado === 'Activa' ? `
                        <button class="btn-icon btn-delete-table" onclick="cancelarReserva(${reserva.id})">Cancelar</button>
                    ` : ''}
                    ${esAdmin && reserva.estado === 'Activa' ? `
                        <button class="btn-icon btn-edit-table" onclick="completarReserva(${reserva.id})">Completar</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Verificar si puede modificar la reserva
function puedeModificar(reserva) {
    return esAdmin || reserva.user_id === usuarioActual.id;
}

// Filtrar reservas
function filtrarReservas() {
    const filtroAula = document.getElementById('filtroAula').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroFecha = document.getElementById('filtroFecha').value;

    let reservasFiltradas = reservasData;

    if (filtroAula) {
        reservasFiltradas = reservasFiltradas.filter(r => r.room_id == filtroAula);
    }

    if (filtroEstado) {
        reservasFiltradas = reservasFiltradas.filter(r => r.estado === filtroEstado);
    }

    if (filtroFecha) {
        const fechaBusqueda = new Date(filtroFecha + 'T00:00:00').toISOString().split('T')[0];
        reservasFiltradas = reservasFiltradas.filter(r => {
            const fechaReserva = new Date(r.fecha).toISOString().split('T')[0];
            return fechaReserva === fechaBusqueda;
        });
    }

    mostrarReservas(reservasFiltradas);
}

// Abrir modal para nueva reserva
function abrirModalNueva() {
    document.getElementById('modalTitle').textContent = 'Nueva Reserva';
    document.getElementById('formReserva').reset();

    // Establecer fecha mínima
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;

    document.getElementById('modalReserva').style.display = 'block';
}

// Guardar reserva
async function guardarReserva(e) {
    e.preventDefault();

    const room_id = document.getElementById('roomId').value;
    const fecha = document.getElementById('fecha').value;
    const hora_inicio = document.getElementById('horaInicio').value + ':00';
    const hora_fin = document.getElementById('horaFin').value + ':00';
    const grupo_whatsapp = document.getElementById('grupoWhatsapp').value;
    const token = localStorage.getItem('token');

    // Validar que hora inicio < hora fin
    if (hora_inicio >= hora_fin) {
        alert('La hora de inicio debe ser menor que la hora de fin');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                room_id,
                fecha,
                hora_inicio,
                hora_fin,
                grupo_whatsapp: grupo_whatsapp || null
            })
        });

        const data = await response.json();

        if (data.success) {
            let mensaje = data.message;

            // Si hay enlace de WhatsApp, mostrarlo
            if (data.data.whatsapp_enlace) {
                const enviarWhatsApp = confirm(
                    mensaje + '\n\n¿Deseas enviar la confirmación por WhatsApp?'
                );

                if (enviarWhatsApp) {
                    window.open(data.data.whatsapp_enlace, '_blank');
                }
            } else {
                alert(mensaje);
            }

            cerrarModal();
            await cargarReservas();
            await cargarAulas(); // Actualizar estado de aulas
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear la reserva');
    }
}

// Ver detalle de reserva
async function verDetalle(id) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/reservations/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const reserva = data.data;
            const detalleContent = document.getElementById('detalleContent');

            detalleContent.innerHTML = `
                <div class="detalle-item">
                    <label>ID:</label>
                    <span>${reserva.id}</span>
                </div>
                <div class="detalle-item">
                    <label>Aula:</label>
                    <span>${reserva.aula_nombre} - ${reserva.aula_modulo}</span>
                </div>
                <div class="detalle-item">
                    <label>Usuario:</label>
                    <span>${reserva.usuario_nombre} (${reserva.usuario_email})</span>
                </div>
                <div class="detalle-item">
                    <label>Fecha:</label>
                    <span>${formatearFecha(reserva.fecha)}</span>
                </div>
                <div class="detalle-item">
                    <label>Hora Inicio:</label>
                    <span>${formatearHora(reserva.hora_inicio)}</span>
                </div>
                <div class="detalle-item">
                    <label>Hora Fin:</label>
                    <span>${formatearHora(reserva.hora_fin)}</span>
                </div>
                <div class="detalle-item">
                    <label>Estado:</label>
                    <span class="estado-badge ${reserva.estado.toLowerCase()}">${reserva.estado}</span>
                </div>
                ${reserva.grupo_whatsapp ? `
                    <div class="detalle-item">
                        <label>Grupo WhatsApp:</label>
                        <a href="${reserva.grupo_whatsapp}" target="_blank" class="btn-whatsapp">Abrir Grupo</a>
                    </div>
                ` : ''}
            `;

            document.getElementById('modalDetalle').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle');
    }
}

// Cancelar reserva
async function cancelarReserva(id) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/reservations/${id}/cancelar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarReservas();
            await cargarAulas();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cancelar la reserva');
    }
}

// Completar reserva (solo admin)
async function completarReserva(id) {
    if (!confirm('¿Marcar esta reserva como completada?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/reservations/${id}/completar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            await cargarReservas();
            await cargarAulas();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al completar la reserva');
    }
}

// Formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Formatear hora
function formatearHora(hora) {
    return hora.substring(0, 5); // HH:MM
}

// Cerrar modales
function cerrarModal() {
    document.getElementById('modalReserva').style.display = 'none';
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