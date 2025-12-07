const nodemailer = require('nodemailer');

// Configurar transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificar conexión
transporter.verify(function(error, success) {
    if (error) {
        console.error('Error al conectar con el servidor de email:', error);
    } else {
        console.log('✓ Servidor de email listo para enviar mensajes');
    }
});

// Enviar email de confirmación de reserva
const enviarEmailReserva = async (reservaData) => {
    try {
        const { usuario_email, usuario_nombre, aula_nombre, aula_modulo, fecha, hora_inicio, hora_fin, grupo_whatsapp } = reservaData;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: usuario_email,
            subject: `Confirmación de Reserva - ${aula_nombre}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .info-item { margin: 10px 0; }
            .info-item strong { color: #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Reserva Confirmada</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${usuario_nombre}</strong>,</p>
              <p>Tu reserva ha sido confirmada exitosamente. Aquí están los detalles:</p>
              
              <div class="info-box">
                <div class="info-item">
                  <strong>🏫 Aula:</strong> ${aula_nombre} - ${aula_modulo}
                </div>
                <div class="info-item">
                  <strong>📅 Fecha:</strong> ${formatearFechaEmail(fecha)}
                </div>
                <div class="info-item">
                  <strong>🕐 Hora de inicio:</strong> ${hora_inicio.substring(0, 5)}
                </div>
                <div class="info-item">
                  <strong>🕐 Hora de fin:</strong> ${hora_fin.substring(0, 5)}
                </div>
                ${grupo_whatsapp ? `
                  <div class="info-item">
                    <strong>💬 Grupo de WhatsApp:</strong> 
                    <a href="${grupo_whatsapp}" style="color: #667eea;">Unirse al grupo</a>
                  </div>
                ` : ''}
              </div>
              
              <p><strong>Importante:</strong></p>
              <ul>
                <li>Por favor llega a tiempo para aprovechar el aula completa.</li>
                <li>Recuerda dejar el aula en las mismas condiciones en que la encontraste.</li>
                <li>Si necesitas cancelar, hazlo con anticipación desde el sistema.</li>
              </ul>
              
              <p>Gracias por usar nuestro Sistema de Gestión de Aulas.</p>
              
              <div class="footer">
                <p>Este es un correo automático, por favor no responder.</p>
                <p>Sistema de Gestión de Aulas &copy; 2025</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Email enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error al enviar email:', error);
        return { success: false, error: error.message };
    }
};

// Enviar email de cancelación de reserva
const enviarEmailCancelacion = async (reservaData) => {
    try {
        const { usuario_email, usuario_nombre, aula_nombre, fecha, hora_inicio } = reservaData;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: usuario_email,
            subject: `Reserva Cancelada - ${aula_nombre}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc3545; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Reserva Cancelada</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${usuario_nombre}</strong>,</p>
              <p>Tu reserva ha sido cancelada:</p>
              
              <div class="info-box">
                <p><strong>🏫 Aula:</strong> ${aula_nombre}</p>
                <p><strong>📅 Fecha:</strong> ${formatearFechaEmail(fecha)}</p>
                <p><strong>🕐 Hora:</strong> ${hora_inicio.substring(0, 5)}</p>
              </div>
              
              <p>Si deseas hacer una nueva reserva, puedes hacerlo desde el sistema.</p>
              
              <div class="footer">
                <p>Sistema de Gestión de Aulas &copy; 2025</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log('✓ Email de cancelación enviado');
        return { success: true };
    } catch (error) {
        console.error('Error al enviar email de cancelación:', error);
        return { success: false, error: error.message };
    }
};

// Función auxiliar para formatear fecha
function formatearFechaEmail(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = {
    enviarEmailReserva,
    enviarEmailCancelacion
};