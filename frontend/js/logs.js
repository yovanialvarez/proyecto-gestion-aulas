const API_URL = 'http://localhost:3000/api';
let logsData = [];
let currentLimit = 100;

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

    // Cargar logs
    await cargarLogs();

    // Event listeners
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnEstadisticas').addEventListener('click', abrirEstadisticas);
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    document.getElementById('btnCargarMas').addEventListener('click', cargarMas);
    document.getElementById('btnCerrarEstadisticas').addEventListener('click', cerrarModal);
    document.querySelector('.close').addEventListener('click', cerrarModal);
});

// Cargar logs
async function cargarLogs(filtros = {}) {
    try {
        const token = localStorage.getItem('token');

        // Construir query string
        const params = new URLSearchParams();
        params.append('limit', currentLimit);

        if (filtros.tabla) params.append('tabla', filtros.tabla);
        if (filtros.accion) params.append('accion', filtros.accion);
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);

        const response = await fetch(`${API_URL}/logs?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            logsData = data.data;
            mostrarLogs(logsData);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el historial');
    }
}

// Mostrar logs en la tabla
function mostrarLogs(logs) {
    const tbody = document.getElementById('logsTableBody');

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay registros en el historial</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.id}</td>
            <td>${log.usuario_nombre || 'Sistema'}</td>
            <td><span class="accion-badge ${log.accion.toLowerCase().replace('_', '')}">${log.accion}</span></td>
            <td>${log.tabla || '-'}</td>
            <td style="max-width: 300px;">${log.detalles || '-'}</td>
            <td>${formatearFecha(log.creado_en)}</td>
        </tr>
    `).join('');
}

// Aplicar filtros
function aplicarFiltros() {
    const filtros = {
        tabla: document.getElementById('filtroTabla').value,
        accion: document.getElementById('filtroAccion').value,
        fecha_inicio: document.getElementById('filtroFechaInicio').value,
        fecha_fin: document.getElementById('filtroFechaFin').value
    };

    cargarLogs(filtros);
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroTabla').value = '';
    document.getElementById('filtroAccion').value = '';
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';

    cargarLogs();
}

// Cargar más registros
function cargarMas() {
    currentLimit += 50;
    aplicarFiltros();
}

// Abrir modal de estadísticas
async function abrirEstadisticas() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/logs/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            mostrarEstadisticas(data.data);
            document.getElementById('modalEstadisticas').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar estadísticas');
    }
}

// Mostrar estadísticas
function mostrarEstadisticas(stats) {
    const content = document.getElementById('estadisticasContent');

    // Calcular totales
    const totalAcciones = stats.accionesPorTipo.reduce((sum, item) => sum + item.total, 0);
    const totalTablas = stats.accionesPorTabla.length;
    const totalUsuarios = stats.usuariosMasActivos.length;

    content.innerHTML = `
        <!-- Cards de resumen -->
        <div class="estadisticas-grid">
            <div class="stat-card">
                <h3>Total de Acciones</h3>
                <div class="stat-number">${totalAcciones}</div>
            </div>
            <div class="stat-card">
                <h3>Tablas Afectadas</h3>
                <div class="stat-number">${totalTablas}</div>
            </div>
            <div class="stat-card">
                <h3>Usuarios Activos</h3>
                <div class="stat-number">${totalUsuarios}</div>
            </div>
        </div>
        
        <!-- Acciones por tipo -->
        <div class="chart-container">
            <h3>Acciones por Tipo</h3>
            ${stats.accionesPorTipo.map(item => {
        const porcentaje = (item.total / totalAcciones * 100).toFixed(1);
        return `
                    <div class="chart-bar">
                        <div class="label">${item.accion}</div>
                        <div class="bar" style="width: ${porcentaje}%">
                            ${item.total} (${porcentaje}%)
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
        
        <!-- Acciones por tabla -->
        <div class="chart-container">
            <h3>Acciones por Tabla</h3>
            ${stats.accionesPorTabla.map(item => {
        const maxTotal = Math.max(...stats.accionesPorTabla.map(i => i.total));
        const porcentaje = (item.total / maxTotal * 100).toFixed(1);
        return `
                    <div class="chart-bar">
                        <div class="label">${item.tabla}</div>
                        <div class="bar" style="width: ${porcentaje}%">
                            ${item.total}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
        
        <!-- Usuarios más activos -->
        <div class="chart-container">
            <h3>Usuarios Más Activos</h3>
            <div class="list-container">
                ${stats.usuariosMasActivos.map((usuario, index) => `
                    <div class="list-item">
                        <span class="name">${index + 1}. ${usuario.nombre} (${usuario.email})</span>
                        <span class="count">${usuario.total_acciones} acciones</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Actividad reciente -->
        <div class="chart-container">
            <h3>Actividad de los Últimos 7 Días</h3>
            <div class="list-container">
                ${stats.actividadReciente.map(dia => `
                    <div class="list-item">
                        <span class="name">${formatearFechaSolo(dia.fecha)}</span>
                        <span class="count">${dia.total} acciones</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Formatear fecha completa
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Formatear solo fecha
function formatearFechaSolo(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalEstadisticas').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}