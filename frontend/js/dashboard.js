const API_URL = 'http://localhost:3000/api';

// Verificar si el usuario está autenticado
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!token || !usuario) {
    window.location.href = 'index.html';
}

// Verificar si es admin
const esAdmin = usuario.rol === 'ADMIN';

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

    // Ocultar gráfico de usuarios
    document.getElementById('chartUsuariosCard').style.display = 'none';
} else {
    // Mostrar actividad del sistema solo para admin
    document.getElementById('actividadCard').style.display = 'block';
}

// Cerrar sesión
document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
});

// Cargar estadísticas
cargarEstadisticas();

async function cargarEstadisticas() {
    try {
        const response = await fetch(`${API_URL}/dashboard/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            mostrarEstadisticas(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar estadísticas');
    }
}

function mostrarEstadisticas(stats) {
    // Tarjetas de resumen
    document.getElementById('totalAulas').textContent = stats.aulas.total;
    const aulasLibres = stats.aulas.porEstado.find(e => e.estado === 'Libre')?.total || 0;
    document.getElementById('aulasLibres').textContent = `${aulasLibres} libres`;

    document.getElementById('totalRecursos').textContent = stats.recursos.total;
    const recursosActivos = stats.recursos.porEstado.find(e => e.estado === 'Activo')?.total || 0;
    document.getElementById('recursosActivos').textContent = `${recursosActivos} activos`;

    document.getElementById('reservasActivas').textContent = stats.reservas.activas;
    const totalReservas = stats.reservas.porEstado.reduce((sum, e) => sum + e.total, 0);
    document.getElementById('totalReservas').textContent = `${totalReservas} totales`;

    document.getElementById('totalDanos').textContent = stats.danos.total;

    // Gráficos
    mostrarGrafico('chartAulas', stats.aulas.porEstado, stats.aulas.total);
    mostrarGrafico('chartRecursos', stats.recursos.porEstado, stats.recursos.total);

    if (esAdmin) {
        mostrarGrafico('chartUsuarios', stats.usuarios.porRol, stats.usuarios.total);
    }

    mostrarGrafico('chartReservas', stats.reservas.porEstado, totalReservas);

    // Actividad reciente
    mostrarUltimasReservas(stats.recientes.reservas);
    mostrarUltimosDanos(stats.recientes.danos);

    if (esAdmin) {
        mostrarUltimaActividad(stats.recientes.actividad);
    }
}

function mostrarGrafico(containerId, datos, total) {
    const container = document.getElementById(containerId);

    if (datos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Sin datos</p>';
        return;
    }

    container.innerHTML = datos.map(item => {
        const porcentaje = total > 0 ? (item.total / total * 100) : 0;
        const etiqueta = item.estado || item.rol;

        return `
            <div class="chart-item">
                <div class="label">${etiqueta}</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${porcentaje}%">
                        ${item.total}
                    </div>
                </div>
                <div class="count">${porcentaje.toFixed(0)}%</div>
            </div>
        `;
    }).join('');
}

function mostrarUltimasReservas(reservas) {
    const container = document.getElementById('ultimasReservas');

    if (reservas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay reservas recientes</p>';
        return;
    }

    container.innerHTML = reservas.map(reserva => `
        <div class="activity-item">
            <div class="item-title">${reserva.aula_nombre}</div>
            <div class="item-details">
                👤 ${reserva.usuario_nombre}<br>
                📅 ${formatearFecha(reserva.fecha)} ${formatearHora(reserva.hora_inicio)} - ${formatearHora(reserva.hora_fin)}
            </div>
            <div class="item-time">${tiempoTranscurrido(reserva.creado_en)}</div>
        </div>
    `).join('');
}

function mostrarUltimosDanos(danos) {
    const container = document.getElementById('ultimosDanos');

    if (danos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay daños reportados</p>';
        return;
    }

    container.innerHTML = danos.map(dano => `
        <div class="activity-item">
            <div class="item-title">${dano.recurso_tipo} - ${dano.recurso_codigo}</div>
            <div class="item-details">
                👤 Reportado por: ${dano.usuario_nombre}<br>
                📝 ${truncarTexto(dano.descripcion, 60)}
            </div>
            <div class="item-time">${tiempoTranscurrido(dano.creado_en)}</div>
        </div>
    `).join('');
}

function mostrarUltimaActividad(actividad) {
    const container = document.getElementById('ultimaActividad');

    if (actividad.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay actividad reciente</p>';
        return;
    }

    container.innerHTML = actividad.map(log => `
        <div class="activity-item">
            <div class="item-title">${log.accion} - ${log.tabla || 'Sistema'}</div>
            <div class="item-details">
                👤 ${log.usuario_nombre || 'Sistema'}<br>
                📝 ${log.detalles || 'Sin detalles'}
            </div>
            <div class="item-time">${tiempoTranscurrido(log.creado_en)}</div>
        </div>
    `).join('');
}

// Utilidades
function formatearFecha(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatearHora(hora) {
    return hora.substring(0, 5);
}

function truncarTexto(texto, longitud) {
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
}

function tiempoTranscurrido(fecha) {
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diferencia = Math.floor((ahora - entonces) / 1000); // segundos

    if (diferencia < 60) return 'Hace un momento';
    if (diferencia < 3600) return `Hace ${Math.floor(diferencia / 60)} minutos`;
    if (diferencia < 86400) return `Hace ${Math.floor(diferencia / 3600)} horas`;
    if (diferencia < 604800) return `Hace ${Math.floor(diferencia / 86400)} días`;

    return entonces.toLocaleDateString('es-ES');
}