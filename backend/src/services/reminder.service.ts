import { supabaseAdmin } from '../config/supabase.js';
import { whatsappService } from './whatsapp.service.js';
import { emailService } from './email.service.js';

export const reminderService = {

  async processReminders() {
    console.log('⏰ Ejecutando job de recordatorios...');

    // Obtener recordatorios pendientes con datos de la cita
    const { data: recordatorios, error } = await supabaseAdmin
      .from('recordatorios')
      .select(`
            id, tipo, scheduled_at, estado, cita_id, empresa_id,
            citas:cita_id(
                id,
                fecha_hora,
                cliente:clientes(id, nombre, telefono, email),
                servicio:servicios(nombre),
                sucursal:sucursales(nombre),
                empleado:empleados(nombre)
            )
        `)
      .eq('estado', 'PENDIENTE')
      .lte('scheduled_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching reminders:', error.message);
      return;
    }

    if (!recordatorios || recordatorios.length === 0) {
      return { processed: 0, sent: 0 };
    }

    let sentCount = 0;

    for (const recordatorio of recordatorios) {
      const { data: config } = await supabaseAdmin
        .from('configuraciones')
        .select('recordatorios_whatsapp, recordatorios_email, wa_phone_number_id, wa_access_token, wa_template_name')
        .eq('empresa_id', recordatorio.empresa_id)
        .single();

      const cita: any = recordatorio.citas;
      const cliente = cita?.cliente;

      if (!cliente) {
        await supabaseAdmin.from('recordatorios').update({ estado: 'FALLIDO' }).eq('id', recordatorio.id);
        continue;
      }

      const { data: empresa } = await supabaseAdmin
        .from('empresas')
        .select('nombre')
        .eq('id', recordatorio.empresa_id)
        .single();

      const companyName = empresa?.nombre || 'AgendaPro';
      const citaDate = new Date(cita.fecha_hora);
      const formattedDate = citaDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
      const formattedTime = citaDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
      const hoursUntil = Math.round((citaDate.getTime() - Date.now()) / (1000 * 60 * 60));

      try {
        // ===== 1. WHATSAPP REMINDER =====
        if (recordatorio.tipo === 'WHATSAPP' && cliente.telefono) {
          const templateName = config?.wa_template_name || 'recordatorio_cita';
          const mensaje = `Hola ${cliente.nombre}! 📅 Te recordamos tu cita de *${cita.servicio?.nombre}* el día *${formattedDate}* a las *${formattedTime}*${cita.sucursal?.nombre ? ` en ${cita.sucursal.nombre}` : ''}. ¡Te esperamos! - ${companyName}`;

          const templateComponents = [{
            type: 'body',
            parameters: [
              { type: 'text', text: cliente.nombre },
              { type: 'text', text: cita.servicio?.nombre || 'Servicio' },
              { type: 'text', text: formattedDate },
              { type: 'text', text: formattedTime },
              { type: 'text', text: cita.sucursal?.nombre || '' },
            ]
          }];

          // Usa sendSmartMessage: si la ventana está abierta envía texto, si no envía template
          const result = await whatsappService.sendSmartMessage(
            cliente.telefono,
            mensaje,
            recordatorio.empresa_id,
            cliente.id,
            {
              templateName,
              languageCode: 'es',
              components: templateComponents,
            }
          );

          if (result.success) {
            console.log(`✅ Recordatorio WA enviado a ${cliente.nombre} via ${result.method}`);
            await supabaseAdmin.from('recordatorios').update({ estado: 'ENVIADO' }).eq('id', recordatorio.id);
            sentCount++;
          } else {
            console.error(`❌ Recordatorio WA fallido para ${cliente.nombre}: ${result.error}`);
            await supabaseAdmin.from('recordatorios').update({ estado: 'FALLIDO' }).eq('id', recordatorio.id);
          }
        }

        // ===== 2. EMAIL REMINDER =====
        if (recordatorio.tipo === 'EMAIL' && cliente.email) {
          const result = await emailService.sendAppointmentReminder({
            clientName: cliente.nombre,
            clientEmail: cliente.email,
            date: formattedDate,
            time: formattedTime,
            serviceName: cita.servicio?.nombre || 'Servicio',
            employeeName: cita.empleado?.nombre || 'Profesional',
            branchName: cita.sucursal?.nombre || '',
            companyName,
            hoursUntil,
          });

          if (result.success) {
            await supabaseAdmin.from('recordatorios').update({ estado: 'ENVIADO' }).eq('id', recordatorio.id);
            sentCount++;
          } else {
            await supabaseAdmin.from('recordatorios').update({ estado: 'FALLIDO' }).eq('id', recordatorio.id);
          }
        }
      } catch (e) {
        console.error(`❌ Error enviando recordatorio ${recordatorio.id}:`, e);
        await supabaseAdmin.from('recordatorios').update({ estado: 'FALLIDO' }).eq('id', recordatorio.id);
      }
    }

    return { processed: recordatorios.length, sent: sentCount };
  },
};