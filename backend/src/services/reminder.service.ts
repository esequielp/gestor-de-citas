import prisma from '../prisma/client';
import { settingsService } from './settings.service';

export const reminderService = {
  
  async processReminders() {
    console.log('⏰ Ejecutando job de recordatorios...');
    const settings = await settingsService.getSettings();
    
    // Parsear configuración (ej: "24,1" -> [24, 1])
    const emailConfigs = settings.emailReminders.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const whatsappConfigs = settings.whatsappReminders.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

    // Obtener citas futuras confirmadas
    // Nota: En producción, filtraríamos por fecha en DB para no traer todo el historial
    const appointments = await prisma.appointment.findMany({
      where: { status: 'confirmed' },
      include: { client: true, service: true, branch: true, employee: true }
    });

    const now = new Date();
    let sentCount = 0;

    for (const appt of appointments) {
      // Construir fecha de la cita
      const [year, month, day] = appt.date.split('-').map(Number);
      const apptDate = new Date(year, month - 1, day, appt.time, 0, 0);
      
      // Horas faltantes para la cita (puede ser negativo si ya pasó, o decimal ej: 0.5 para 30 min)
      const diffInHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Si la cita ya pasó hace más de 1 hora, la ignoramos
      if (diffInHours < -1) continue;

      // --- Procesar Email Reminders ---
      let emailLog = JSON.parse(appt.emailRemindersLog || '[]');
      let emailUpdated = false;

      for (const threshold of emailConfigs) {
        // Si estamos dentro del rango (ej: falta menos de 24h) Y no se ha enviado este recordatorio específico
        if (diffInHours <= threshold && !emailLog.includes(threshold)) {
             // Validación extra: No enviar si falta demasiado poco y es un recordatorio de largo plazo
             // Ej: Si configuro 24h, pero creo la cita 1h antes, se enviarían ambos. Esto es aceptable para MVP.
             try {
                await this.sendToN8n(appt, settings, 'email', threshold);
                emailLog.push(threshold);
                emailUpdated = true;
                sentCount++;
                console.log(`✅ Email sent (${threshold}h before) for ${appt.client.name}`);
             } catch (e) {
                console.error(`❌ Error sending Email (${threshold}h):`, e);
             }
        }
      }

      // --- Procesar WhatsApp Reminders ---
      let whatsappLog = JSON.parse(appt.whatsappRemindersLog || '[]');
      let waUpdated = false;

      for (const threshold of whatsappConfigs) {
        if (diffInHours <= threshold && !whatsappLog.includes(threshold)) {
             try {
                await this.sendToN8n(appt, settings, 'whatsapp', threshold);
                whatsappLog.push(threshold);
                waUpdated = true;
                sentCount++;
                console.log(`✅ WhatsApp sent (${threshold}h before) for ${appt.client.name}`);
             } catch (e) {
                console.error(`❌ Error sending WhatsApp (${threshold}h):`, e);
             }
        }
      }

      // Guardar logs actualizados si hubo cambios
      if (emailUpdated || waUpdated) {
        await prisma.appointment.update({
            where: { id: appt.id },
            data: {
                emailRemindersLog: JSON.stringify(emailLog),
                whatsappRemindersLog: JSON.stringify(whatsappLog)
            }
        });
      }
    }

    return { processed: appointments.length, sent: sentCount };
  },

  async sendToN8n(appt: any, settings: any, type: 'whatsapp' | 'email', triggerTime: number) {
    if (!settings.n8nWebhookUrl) return;

    const payload = {
      type, // 'whatsapp' or 'email'
      trigger: `${triggerTime}h_before`, // Para que n8n sepa cuál recordatorio es
      cliente: appt.client.name,
      email: appt.client.email,
      telefono: appt.client.phone,
      fecha: appt.date,
      hora: `${appt.time}:00`,
      servicio: appt.service.name,
      sucursal: appt.branch.name,
      profesional: appt.employee.name
    };

    const response = await fetch(settings.n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.n8nApiKey || ''}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`N8N webhook failed with status ${response.status}`);
    }
  }
};