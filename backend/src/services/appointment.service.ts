import { supabaseAdmin } from '../config/supabase.js';
import { backendLogger } from '../utils/logger.js';

interface CreateAppointmentDTO {
  tenantId: string;
  branchId: string;
  serviceId: string;
  employeeId: string;
  clientId: string;
  date: string;
  time: number;
}

export const appointmentService = {

  // 1. Obtener Slots Disponibles (Motor de Horarios)
  async getAvailableSlots(tenantId: string, branchId: string, serviceId: string, dateStr: string) {
    backendLogger.info('AppointmentService', 'getAvailableSlots called', { tenantId, branchId, serviceId, dateStr });

    // a. Obtener la duración del servicio
    const { data: service, error: sErr } = await supabaseAdmin
      .from('servicios')
      .select('duracion_minutos')
      .eq('id', serviceId)
      .single();
    if (sErr || !service) {
      backendLogger.error('AppointmentService', 'Servicio no encontrado', { serviceId, error: sErr });
      throw new Error("Servicio no encontrado");
    }
    const duration = service.duracion_minutos || 60; // default 60 mins just in case
    backendLogger.info('AppointmentService', `Servicio encontrado. Duración: ${duration} min`);

    // b. Obtener empleados en esa sucursal que ofrezcan ese servicio
    const { data: allEmployees, error: eErr } = await supabaseAdmin
      .from('empleados')
      .select('id, weekly_schedule, service_ids')
      .eq('sucursal_id', branchId)
      .eq('empresa_id', tenantId)
      .eq('is_active', true);

    const employees = (allEmployees || []).filter((e: any) => {
      if (!e.service_ids) return false;
      let sids = e.service_ids;
      if (typeof sids === 'string') {
        try { sids = JSON.parse(sids); } catch (err) { }
      }
      backendLogger.info('FilterDebug', `Emp ${e.id} sids type: ${typeof sids} isArr: ${Array.isArray(sids)}`, { sids });
      return Array.isArray(sids) ? sids.includes(serviceId) : sids === serviceId;
    });

    if (eErr) {
      backendLogger.error('AppointmentService', 'Error obteniendo empleados', { branchId, error: eErr });
      throw new Error("Error obteniendo empleados");
    }

    if (!employees || employees.length === 0) {
      backendLogger.warn('AppointmentService', 'No hay empleados para este servicio en la sucursal', { branchId, serviceId });
      return []; // Nadie en la sucursal ofrece este servicio
    }

    backendLogger.info('AppointmentService', `Empleados encontrados: ${employees.length}`, { ids: employees.map(e => e.id) });

    // c. Cargar excepciones para ese día (vacaciones, incapacidad, horario especial)
    const { data: exceptions } = await supabaseAdmin
      .from('employee_exceptions')
      .select('empleado_id, tipo, ranges')
      .eq('empresa_id', tenantId)
      .in('empleado_id', employees.map(e => e.id))
      .eq('fecha', dateStr);

    const exceptionMap: Record<string, { tipo: string, ranges: any[] }> = {};
    if (exceptions) {
      exceptions.forEach(ex => {
        exceptionMap[ex.empleado_id] = { tipo: ex.tipo, ranges: ex.ranges || [] };
      });
    }

    // d. Cargar citas confirmadas para ese día para calcular overlappings
    const startOfDay = new Date(dateStr + 'T00:00:00');
    const endOfDay = new Date(dateStr + 'T23:59:59');

    const { data: appointments, error: aErr } = await supabaseAdmin
      .from('citas')
      .select('empleado_id, fecha_hora, servicios(duracion_minutos)')
      .eq('empresa_id', tenantId)
      .in('empleado_id', employees.map(e => e.id))
      .gte('fecha_hora', startOfDay.toISOString())
      .lte('fecha_hora', endOfDay.toISOString())
      .in('estado', ['CONFIRMADA', 'PENDIENTE']);

    if (aErr) backendLogger.error('AppointmentService', 'Error fetching existing appointments', { error: aErr });

    // Mapeo de tiempos bloqueados por empleado (en minutos desde medianoche)
    const blockedRanges: Record<string, { start: number, end: number }[]> = {};
    employees.forEach(e => blockedRanges[e.id] = []);

    if (appointments) {
      appointments.forEach(appt => {
        const dateObj = new Date(appt.fecha_hora);
        const startMins = dateObj.getHours() * 60 + dateObj.getMinutes();
        // @ts-ignore
        const dur = appt.servicios?.duracion_minutos || 60;
        blockedRanges[appt.empleado_id].push({ start: startMins, end: startMins + dur });
      });
    }

    // e. Determinar el día de la semana (0 = Domingo)
    const dayOfWeek = startOfDay.getDay();
    const validSlotsMap: Record<number, string[]> = {};

    // Generar slots dinámicamente según la duración del servicio
    // Si dura 60 min → slots cada 60 min (8:00, 9:00, 10:00...)
    // Si dura 45 min → slots cada 45 min (8:00, 8:45, 9:30...)
    // Si dura 30 min → slots cada 30 min (8:00, 8:30, 9:00...)
    // Si dura 15 min → slots cada 15 min (8:00, 8:15, 8:30...)
    const slotStep = duration >= 60 ? 60 : duration >= 45 ? 45 : duration >= 30 ? 30 : 15;
    backendLogger.info('AppointmentService', `Slot step calculado: ${slotStep} min (basado en duración de ${duration} min)`);
    // No hardcodear rango global; se determinará por cada empleado
    const globalStart = 6 * 60;  // 06:00
    const globalEnd = 23 * 60;   // 23:00

    for (let currentSlot = globalStart; currentSlot + duration <= globalEnd; currentSlot += slotStep) {
      const slotEnd = currentSlot + duration;

      for (const emp of employees) {
        // Verificar 0: ¿Tiene excepción para este día?
        const exception = exceptionMap[emp.id];
        if (exception) {
          if (exception.tipo === 'NO_LABORABLE') continue; // Vacaciones/incapacidad

          // HORARIO_ESPECIAL: usar los ranges de la excepción en lugar del schedule normal
          if (exception.tipo === 'HORARIO_ESPECIAL') {
            const worksNow = exception.ranges.some((r: any) => {
              const workStart = r.start * 60;
              const workEnd = r.end * 60;
              return currentSlot >= workStart && slotEnd <= workEnd;
            });
            if (!worksNow) continue;
            // Si llega aquí, el empleado trabaja en este slot por excepción
          }
        } else {
          // Verificar 1: ¿Trabaja a esta hora según horario normal?
          const schedule = emp.weekly_schedule as any[];
          const daySchedule = schedule?.find(d => d.dayOfWeek === dayOfWeek);

          let worksNow = false;
          if (daySchedule && daySchedule.isWorkDay && daySchedule.ranges) {
            worksNow = daySchedule.ranges.some((r: any) => {
              const workStart = r.start * 60;
              const workEnd = r.end * 60;
              return currentSlot >= workStart && slotEnd <= workEnd;
            });
          }
          if (!worksNow) continue;
        }

        // Verificar 2: ¿Hay intersección con otra cita de este empleado?
        const empBlocks = blockedRanges[emp.id];
        const hasOverlap = empBlocks.some(block => {
          return currentSlot < block.end && block.start < slotEnd;
        });

        if (!hasOverlap) {
          if (!validSlotsMap[currentSlot]) validSlotsMap[currentSlot] = [];
          validSlotsMap[currentSlot].push(emp.id);
        }
      }
    }

    // Interfaz amigable para retorno
    return Object.keys(validSlotsMap).map(Number).sort((a, b) => a - b).map(mins => {
      const hh = Math.floor(mins / 60).toString().padStart(2, '0');
      const mm = (mins % 60).toString().padStart(2, '0');
      return {
        timeString: `${hh}:${mm}`, // "09:30"
        timeString12h: new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // "09:30 AM"
        minutesFromMidnight: mins, // 570
        availableEmployeeIds: validSlotsMap[mins] // ["id-del-empleado"]
      };
    });
  },

  // 2. Crear Cita con validación basada en el nuevo motor
  async create(data: CreateAppointmentDTO) {
    // En lugar del viejo `checkAvailability`, re-usamos `getAvailableSlots`
    const slots = await this.getAvailableSlots(data.tenantId, data.branchId, data.serviceId, data.date);

    // Verificamos si en `slots` existe un slot cuyo 'minutesFromMidnight' coincida con `data.time`
    // y si la lista de 'availableEmployeeIds' incluye al empleado deseado `data.employeeId`.
    const matchingSlot = slots.find(s => s.minutesFromMidnight === data.time);

    let finalEmployeeId = data.employeeId;
    if (data.employeeId === 'any' && matchingSlot && matchingSlot.availableEmployeeIds.length > 0) {
      finalEmployeeId = matchingSlot.availableEmployeeIds[Math.floor(Math.random() * matchingSlot.availableEmployeeIds.length)]; // Pick random available
    }

    const isAvailable = matchingSlot && matchingSlot.availableEmployeeIds.includes(finalEmployeeId);

    if (!isAvailable) {
      throw new Error("SLOT_TAKEN: El horario está ocupado o no hay disponibilidad.");
    }

    const [year, month, day] = data.date.split('-').map(Number);
    const dt = new Date(year, month - 1, day);
    dt.setHours(Math.floor(data.time / 60), data.time % 60, 0, 0);

    // Crear la cita
    const { data: newCita, error } = await supabaseAdmin
      .from('citas')
      .insert([{
        empresa_id: data.tenantId,
        sucursal_id: data.branchId,
        empleado_id: finalEmployeeId,
        cliente_id: data.clientId,
        servicio_id: data.serviceId,
        fecha_hora: dt.toISOString(),
        estado: 'CONFIRMADA'
      }])
      .select(`*, empleado:empleados(nombre), cliente:clientes(nombre, email, telefono), servicio:servicios(nombre), empresa:empresas(nombre)`)
      .single();

    if (error) throw new Error(error.message);

    // Obtener información del servicio para las sesiones
    const { data: serviceInfo } = await supabaseAdmin
      .from('servicios')
      .select('sesiones_totales')
      .eq('id', data.serviceId)
      .single();

    const totalSesiones = serviceInfo?.sesiones_totales || 1;
    const sesionesInsert = [];
    for (let i = 1; i <= totalSesiones; i++) {
      sesionesInsert.push({
        cita_id: newCita.id,
        numero_sesion: i,
        estado: i === 1 ? 'PENDIENTE' : 'POR_PROGRAMAR'
      });
    }

    await supabaseAdmin.from('sesiones').insert(sesionesInsert);

    // Enviar correo de confirmación asincrono usando Resend
    import('./email.service.js').then(({ emailService }) => {
      if (newCita.cliente && newCita.cliente.email) {
        const formattedDate = dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
        const formattedTime = dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        emailService.sendAppointmentCreated({
          clientName: newCita.cliente.nombre || 'Cliente',
          clientEmail: newCita.cliente.email,
          date: formattedDate,
          time: formattedTime,
          serviceName: newCita.servicio?.nombre || 'Servicio',
          employeeName: newCita.empleado?.nombre || 'Especialista',
          branchName: '',
          companyName: newCita.empresa?.nombre || 'AgendaPro'
        });
      }
    }).catch(e => backendLogger.error('AppointmentService', 'Error cargando emailService', { error: e.message }));

    // Enviar confirmación por WhatsApp (si el cliente tiene teléfono)
    import('./whatsapp.service.js').then(({ whatsappService }) => {
      const clientPhone = newCita.cliente?.telefono;
      if (clientPhone) {
        const formattedDate = dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
        const formattedTime = dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        const msg = `✅ *Cita Confirmada*\n\n` +
          `📋 *Servicio:* ${newCita.servicio?.nombre || 'Servicio'}\n` +
          `👤 *Profesional:* ${newCita.empleado?.nombre || 'Asignado'}\n` +
          `📅 *Fecha:* ${formattedDate}\n` +
          `🕐 *Hora:* ${formattedTime}\n\n` +
          `Si necesitas reprogramar o cancelar, por favor contáctanos con anticipación.\n\n` +
          `_${newCita.empresa?.nombre || 'AgendaPro'}_`;
        whatsappService.sendMessage(clientPhone, msg, data.tenantId, newCita.cliente_id);
        backendLogger.info('AppointmentService', 'WhatsApp confirmation sent', { phone: clientPhone });
      }
    }).catch(e => backendLogger.warn('AppointmentService', 'WhatsApp send failed (non-critical)', { error: e?.message }));

    return this._mapAppointment(newCita);
  },

  // Obtener todas las citas
  async getAll(tenantId: string, filters?: { branchId?: string; date?: string }) {
    let query = supabaseAdmin
      .from('citas')
      .select(`*, empleado:empleados(nombre), cliente:clientes(nombre), servicio:servicios(nombre)`)
      .eq('empresa_id', tenantId)
      .order('fecha_hora', { ascending: false });

    if (filters?.branchId) {
      query = query.eq('sucursal_id', filters.branchId);
    }

    if (filters?.date) {
      // Filtrar por el dia especifico
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('fecha_hora', start.toISOString()).lte('fecha_hora', end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(appt => this._mapAppointment(appt));
  },

  // Helper para mapear campos de BD a campos de Frontend
  _mapAppointment(appt: any) {
    if (!appt) return null;
    const dt = new Date(appt.fecha_hora);
    // Use local date parts consistently (avoid toISOString which is always UTC)
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;
    return {
      ...appt, // Mantener originales por si acaso
      branchId: appt.sucursal_id,
      serviceId: appt.servicio_id,
      employeeId: appt.empleado_id,
      clientId: appt.cliente_id,
      date: localDateStr,
      time: dt.getHours() * 60 + dt.getMinutes(),
      clientName: appt.cliente?.nombre || 'Cliente',
      status: appt.estado?.toLowerCase() === 'confirmada' ? 'confirmed' : 'cancelled',
      createdAt: appt.created_at || appt.fecha_hora
    };
  },

  async update(tenantId: string, id: string, data: any) {
    const payload: any = {};
    if (data.status) payload.estado = data.status;

    // Update date/time
    if (data.date && data.time !== undefined) {
      const [year, month, day] = data.date.split('-').map(Number);
      const dt = new Date(year, month - 1, day);
      dt.setMinutes(dt.getMinutes() + data.time);
      payload.fecha_hora = dt.toISOString();
    }

    if (data.employeeId) payload.empleado_id = data.employeeId;
    if (data.serviceId) payload.servicio_id = data.serviceId;

    const { data: result, error } = await supabaseAdmin
      .from('citas')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  },

  async delete(tenantId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('citas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', tenantId);

    if (error) throw new Error(error.message);
    return true;
  },

  // Obtener sesiones de una cita
  async getSessions(tenantId: string, appointmentId: string) {
    // Validar primero que la cita pertenece al tenant
    const { data: cita } = await supabaseAdmin
      .from('citas')
      .select('id')
      .eq('id', appointmentId)
      .eq('empresa_id', tenantId)
      .single();

    if (!cita) throw new Error("Cita no encontrada o no pertenece al tenant");

    const { data: sessions, error } = await supabaseAdmin
      .from('sesiones')
      .select('*')
      .eq('cita_id', appointmentId)
      .order('numero_sesion', { ascending: true });

    if (error) throw new Error(error.message);
    return sessions;
  },

  async updateSession(tenantId: string, sessionId: string, data: any) {
    // Para simplificar, asumimos que si llegamos aquí es porque el middleware validó el tenant.
    // Pero por seguridad validamos la cita dueña de la sesión.
    const { data: session } = await supabaseAdmin
      .from('sesiones')
      .select('*, cita:citas(empresa_id)')
      .eq('id', sessionId)
      .single();

    // @ts-ignore
    if (!session || session.cita.empresa_id !== tenantId) {
      throw new Error("Sesión no encontrada o sin acceso");
    }

    const { data: result, error } = await supabaseAdmin
      .from('sesiones')
      .update({
        estado: data.estado,
        notas: data.notas
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  }
};