import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'AgendaPro <onboarding@resend.dev>'; // Change to your verified domain

// ─── Email Templates ──────────────────────────────────────────────────

const baseLayout = (content: string, companyName: string = 'AgendaPro') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; color: #374151; line-height: 1.6; }
    .body h2 { color: #1f2937; font-size: 20px; margin: 0 0 16px; }
    .body p { margin: 0 0 16px; font-size: 15px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; min-width: 140px; font-weight: 600; }
    .info-value { color: #1f2937; font-weight: 500; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 16px 0; }
    .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .btn-success { background: linear-gradient(135deg, #059669, #10b981); }
    .footer { padding: 24px; text-align: center; background: #f9fafb; border-top: 1px solid #f3f4f6; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge-confirmed { background: #d1fae5; color: #065f46; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .badge-modified { background: #fef3c7; color: #92400e; }
    .badge-reminder { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div style="padding: 24px 0;">
    <div class="container">
      <div class="header">
        <h1>${companyName}</h1>
        <p>Sistema de Gestión de Citas</p>
      </div>
      ${content}
      <div class="footer">
        <p>Este correo fue enviado automáticamente por ${companyName}.</p>
        <p style="margin-top: 8px;">Powered by AgendaPro ✨</p>
      </div>
    </div>
  </div>
</body>
</html>`;

// ─── Template Functions ──────────────────────────────────────────────

const templates = {
  // 1. Registro de usuario
  userRegistration: (userName: string, companyName: string) => baseLayout(`
    <div class="body">
      <h2>¡Bienvenido a ${companyName}! 🎉</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente. Ya puedes acceder a tu panel administrativo y comenzar a gestionar tu negocio.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="#" class="btn btn-success">Ir a mi Panel</a>
      </div>
      <p>Si necesitas ayuda para comenzar, no dudes en contactarnos.</p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
    </div>
  `, companyName),

  // 2. Olvido de contraseña
  passwordReset: (userName: string, resetLink: string, companyName: string) => baseLayout(`
    <div class="body">
      <h2>Restablecer Contraseña 🔐</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" class="btn">Restablecer Contraseña</a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Este enlace expirará en 1 hora. Si no solicitaste el cambio de contraseña, puedes ignorar este correo de forma segura.</p>
    </div>
  `, companyName),

  // 3. Cita creada
  appointmentCreated: (data: AppointmentEmailData) => baseLayout(`
    <div class="body">
      <h2>Cita Confirmada ✅</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Tu cita ha sido agendada exitosamente. Aquí tienes los detalles:</p>
      <div class="info-card">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">📅 Fecha</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.date}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">⏰ Hora</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.time}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">💇 Servicio</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">👤 Profesional</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.employeeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">📍 Sucursal</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.branchName}</td></tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Si necesitas modificar o cancelar tu cita, contáctanos con anticipación.</p>
    </div>
  `, data.companyName),

  // 4. Cita modificada
  appointmentModified: (data: AppointmentEmailData) => baseLayout(`
    <div class="body">
      <h2>Cita Modificada 📝</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Tu cita ha sido modificada. Estos son los nuevos detalles:</p>
      <div class="info-card">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">📅 Fecha</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.date}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">⏰ Hora</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.time}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">💇 Servicio</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">👤 Profesional</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.employeeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">📍 Sucursal</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.branchName}</td></tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Por favor, toma nota de los cambios realizados.</p>
    </div>
  `, data.companyName),

  // 5. Cita eliminada
  appointmentCancelled: (data: AppointmentEmailData) => baseLayout(`
    <div class="body">
      <h2>Cita Cancelada ❌</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Lamentamos informarte que tu siguiente cita ha sido cancelada:</p>
      <div class="info-card">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">📅 Fecha</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.date}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">⏰ Hora</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.time}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">💇 Servicio</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.serviceName}</td></tr>
        </table>
      </div>
      <p>Si deseas reagendar, no dudes en contactarnos o agendar una nueva cita desde nuestro sitio.</p>
    </div>
  `, data.companyName),

  // 6. Cita reagendada
  appointmentRescheduled: (data: AppointmentEmailData & { oldDate: string; oldTime: string }) => baseLayout(`
    <div class="body">
      <h2>Cita Reagendada 🔄</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Tu cita ha sido reagendada. Estos son los nuevos detalles:</p>
      <div class="info-card" style="background: #fef3c7; border-color: #fde68a;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #92400e; font-weight: 600;">Fecha anterior:</p>
        <p style="margin: 0; font-size: 14px; color: #78350f; text-decoration: line-through;">${data.oldDate} a las ${data.oldTime}</p>
      </div>
      <div class="info-card">
        <p style="margin: 0 0 12px; font-size: 13px; color: #059669; font-weight: 700;">✨ Nueva fecha:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">📅 Fecha</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.date}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">⏰ Hora</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.time}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">💇 Servicio</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">👤 Profesional</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.employeeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">📍 Sucursal</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.branchName}</td></tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 13px;">¡Te esperamos en tu nueva fecha!</p>
    </div>
  `, data.companyName),

  // 7. Recordatorio
  appointmentReminder: (data: AppointmentEmailData & { hoursUntil: number }) => baseLayout(`
    <div class="body">
      <h2>Recordatorio de Cita ⏰</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Te recordamos que tienes una cita programada ${data.hoursUntil <= 24 ? '<strong>mañana</strong>' : `en <strong>${data.hoursUntil} horas</strong>`}:</p>
      <div class="info-card" style="border-left: 4px solid #4f46e5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">📅 Fecha</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.date}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">⏰ Hora</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.time}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">💇 Servicio</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">👤 Profesional</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.employeeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-weight: 600; border-top: 1px solid #f1f5f9;">📍 Sucursal</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500; border-top: 1px solid #f1f5f9;">${data.branchName}</td></tr>
        </table>
      </div>
      <p>¡Te esperamos! Si necesitas cancelar o reagendar, por favor avísanos con anticipación.</p>
    </div>
  `, data.companyName),

  // 8. Respuesta a formulario de contacto
  contactReply: (data: { clientName: string; originalMessage: string; replyMessage: string; companyName: string }) => baseLayout(`
    <div class="body">
      <h2>Respuesta a tu consulta 💬</h2>
      <p>Hola <strong>${data.clientName}</strong>,</p>
      <p>Gracias por contactarnos. Hemos recibido tu mensaje y aquí tienes nuestra respuesta:</p>
      <div class="info-card" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase;">Tu mensaje original:</p>
        <p style="margin: 0; font-size: 14px; color: #78350f; font-style: italic;">"${data.originalMessage}"</p>
      </div>
      <div class="info-card" style="border-left: 4px solid #4f46e5;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #4338ca; font-weight: 700; text-transform: uppercase;">Nuestra respuesta:</p>
        <p style="margin: 0; font-size: 15px; color: #1f2937; line-height: 1.7;">${data.replyMessage}</p>
      </div>
      <p>Si tienes alguna otra consulta, no dudes en responder a este correo o visitarnos.</p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">¡Gracias por confiar en nosotros! 🙏</p>
    </div>
  `, data.companyName),
};

// ─── Types ──────────────────────────────────────────────────────

interface AppointmentEmailData {
  clientName: string;
  clientEmail: string;
  date: string;
  time: string;
  serviceName: string;
  employeeName: string;
  branchName: string;
  companyName: string;
}

// ─── Email Service ──────────────────────────────────────────────

export const emailService = {
  async sendUserRegistration(email: string, userName: string, companyName: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `¡Bienvenido a ${companyName}! Tu cuenta ha sido creada`,
        html: templates.userRegistration(userName, companyName),
      });
      if (error) {
        console.error('❌ Error sending registration email:', error);
        return { success: false, error };
      }
      console.log('✅ Registration email sent:', data?.id);
      return { success: true, id: data?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendPasswordReset(email: string, userName: string, resetLink: string, companyName: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `Restablecer contraseña - ${companyName}`,
        html: templates.passwordReset(userName, resetLink, companyName),
      });
      if (error) {
        console.error('❌ Error sending password reset email:', error);
        return { success: false, error };
      }
      console.log('✅ Password reset email sent:', data?.id);
      return { success: true, id: data?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendAppointmentCreated(data: AppointmentEmailData) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.clientEmail],
        subject: `Cita confirmada - ${data.serviceName} el ${data.date}`,
        html: templates.appointmentCreated(data),
      });
      if (error) {
        console.error('❌ Error sending appointment created email:', error);
        return { success: false, error };
      }
      console.log('✅ Appointment created email sent:', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendAppointmentModified(data: AppointmentEmailData) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.clientEmail],
        subject: `Cita modificada - ${data.serviceName} el ${data.date}`,
        html: templates.appointmentModified(data),
      });
      if (error) {
        console.error('❌ Error sending appointment modified email:', error);
        return { success: false, error };
      }
      console.log('✅ Appointment modified email sent:', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendAppointmentCancelled(data: AppointmentEmailData) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.clientEmail],
        subject: `Cita cancelada - ${data.serviceName}`,
        html: templates.appointmentCancelled(data),
      });
      if (error) {
        console.error('❌ Error sending appointment cancelled email:', error);
        return { success: false, error };
      }
      console.log('✅ Appointment cancelled email sent:', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendAppointmentRescheduled(data: AppointmentEmailData & { oldDate: string; oldTime: string }) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.clientEmail],
        subject: `Cita reagendada - ${data.serviceName} ahora el ${data.date}`,
        html: templates.appointmentRescheduled(data),
      });
      if (error) {
        console.error('❌ Error sending appointment rescheduled email:', error);
        return { success: false, error };
      }
      console.log('✅ Appointment rescheduled email sent:', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendAppointmentReminder(data: AppointmentEmailData & { hoursUntil: number }) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.clientEmail],
        subject: `Recordatorio: Tu cita de ${data.serviceName} es ${data.hoursUntil <= 24 ? 'mañana' : 'pronto'}`,
        html: templates.appointmentReminder(data),
      });
      if (error) {
        console.error('❌ Error sending appointment reminder email:', error);
        return { success: false, error };
      }
      console.log('✅ Appointment reminder email sent:', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },

  async sendContactReply(data: { email: string; clientName: string; originalMessage: string; replyMessage: string; companyName: string }) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.email],
        subject: `Respuesta a tu consulta - ${data.companyName}`,
        html: templates.contactReply(data),
      });
      if (error) {
        console.error('❌ Error sending contact reply email:', error);
        return { success: false, error };
      }
      console.log('✅ Contact reply email sent to', data.email, ':', result?.id);
      return { success: true, id: result?.id };
    } catch (e) {
      console.error('❌ Email service error:', e);
      return { success: false, error: e };
    }
  },
};
