// Generar enlace de WhatsApp con mensaje pre-configurado
const generarMensajeWhatsApp = (reservaData) => {
    const { usuario_nombre, aula_nombre, aula_modulo, fecha, hora_inicio, hora_fin } = reservaData;

    const mensaje = `
🏫 *Confirmación de Reserva - Sistema de Gestión de Aulas*

✅ Reserva confirmada exitosamente

*Detalles de la reserva:*
Aula: ${aula_nombre} - ${aula_modulo}
Usuario: ${usuario_nombre}
Fecha: ${formatearFechaWhatsApp(fecha)}
Horario: ${hora_inicio.substring(0, 5)} - ${hora_fin.substring(0, 5)}

Por favor, llega puntual y deja el aula en las mismas condiciones.

_Sistema de Gestión de Aulas_
  `.trim();

    return {
        mensaje,
        enlace: generarEnlaceWhatsApp(mensaje)
    };
};

// Generar mensaje de cancelación
const generarMensajeCancelacion = (reservaData) => {
    const { usuario_nombre, aula_nombre, fecha, hora_inicio } = reservaData;

    const mensaje = `
 *Reserva Cancelada*

Tu reserva ha sido cancelada:

Aula: ${aula_nombre}
Usuario: ${usuario_nombre}
Fecha: ${formatearFechaWhatsApp(fecha)}
Hora: ${hora_inicio.substring(0, 5)}

_Sistema de Gestión de Aulas_
  `.trim();

    return {
        mensaje,
        enlace: generarEnlaceWhatsApp(mensaje)
    };
};

// Generar enlace de WhatsApp (puede enviarse al número del usuario o a un grupo)
const generarEnlaceWhatsApp = (mensaje, numeroTelefono = null) => {
    const mensajeCodificado = encodeURIComponent(mensaje);

    if (numeroTelefono) {
        // Enviar a un número específico (formato: 50212345678 sin + ni espacios)
        return `https://wa.me/${numeroTelefono}?text=${mensajeCodificado}`;
    } else {
        // Abrir WhatsApp sin número específico (el usuario elige a quién enviar)
        return `https://wa.me/?text=${mensajeCodificado}`;
    }
};

// Enviar notificación de WhatsApp (simulado - solo genera el enlace y lo registra)
const enviarNotificacionWhatsApp = async (reservaData, tipo = 'confirmacion') => {
    try {
        let resultado;

        if (tipo === 'confirmacion') {
            resultado = generarMensajeWhatsApp(reservaData);
        } else if (tipo === 'cancelacion') {
            resultado = generarMensajeCancelacion(reservaData);
        }

        console.log('✓ Notificación WhatsApp generada');
        console.log('  Enlace:', resultado.enlace);

        // En una implementación real, aquí enviarías el mensaje usando la API de WhatsApp Business
        // Por ahora, solo retornamos el enlace para que el usuario lo pueda usar

        return {
            success: true,
            mensaje: resultado.mensaje,
            enlace: resultado.enlace
        };
    } catch (error) {
        console.error('Error al generar notificación WhatsApp:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Función auxiliar para formatear fecha
function formatearFechaWhatsApp(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = {
    generarMensajeWhatsApp,
    generarMensajeCancelacion,
    generarEnlaceWhatsApp,
    enviarNotificacionWhatsApp
};