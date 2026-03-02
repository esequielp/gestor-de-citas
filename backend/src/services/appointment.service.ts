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
    // 0. Obtener información del servicio
    const { data: serviceInfo, error: srvErr } = await supabaseAdmin
      .from('servicios')
      .select('sesiones_totales')
      .eq('id', data.serviceId)
      .single();

    if (srvErr || !serviceInfo) throw new Error("Servicio no encontrado");
    const isMultiSession = (serviceInfo.sesiones_totales || 1) > 1;

    let finalEmployeeId = data.employeeId;

    if (!isMultiSession) {
      // Validar disponibilidad solo para citas normales
      const slots = await this.getAvailableSlots(data.tenantId, data.branchId, data.serviceId, data.date);
      const matchingSlot = slots.find(s => s.minutesFromMidnight === data.time);

      backendLogger.info('AppointmentService', 'create debug', {
        requestedTime: data.time,
        requestedEmployeeId: finalEmployeeId,
        slotsFound: slots.length,
        matchingSlot
      });

      if (data.employeeId === 'any' && matchingSlot && matchingSlot.availableEmployeeIds.length > 0) {
        finalEmployeeId = matchingSlot.availableEmployeeIds[Math.floor(Math.random() * matchingSlot.availableEmployeeIds.length)];
      }

      const isAvailable = matchingSlot && matchingSlot.availableEmployeeIds.includes(finalEmployeeId);
      if (!isAvailable) {
        backendLogger.error('AppointmentService', 'SLOT_TAKEN debug', {
          isAvailable, finalEmployeeId, matchingSlot
        });
        throw new Error("SLOT_TAKEN: El horario está ocupado o no hay disponibilidad.");
      }
    } else if (finalEmployeeId === 'any') {
      // Para multi-sesión 'any', simplemente elegimos un empleado que ofrezca el servicio
      const { data: emps } = await supabaseAdmin
        .from('empleados')
        .select('id, service_ids')
        .eq('sucursal_id', data.branchId)
        .eq('is_active', true);

      const validEmp = emps?.find(e => {
        let sids = e.service_ids;
        if (typeof sids === 'string') { try { sids = JSON.parse(sids); } catch (err) { } }
        return Array.isArray(sids) ? sids.includes(data.serviceId) : sids === data.serviceId;
      });
      finalEmployeeId = validEmp?.id || data.employeeId;
    }

    const [year, month, day] = data.date.split('-').map(Number);
    const dt = new Date(year, month - 1, day);
    dt.setHours(Math.floor(data.time / 60), data.time % 60, 0, 0);

    // Crear la cita (Padre)
    const { data: newCita, error } = await supabaseAdmin
      .from('citas')
      .insert([{
        empresa_id: data.tenantId,
        sucursal_id: data.branchId,
        empleado_id: finalEmployeeId === 'any' ? null : finalEmployeeId,
        cliente_id: data.clientId,
        servicio_id: data.serviceId,
        fecha_hora: dt.toISOString(),
        estado: 'CONFIRMADA'
      }])
      .select(`*, empleado:empleados(nombre), cliente:clientes(nombre, email, telefono), servicio:servicios(nombre), empresa:empresas(nombre)`)
      .single();

    if (error) throw new Error(error.message);

    // Crear las sesiones (Hijas)
    const totalSesiones = serviceInfo.sesiones_totales || 1;
    if (totalSesiones > 1) {
      const sesionesInsert = [];
      for (let i = 1; i <= totalSesiones; i++) {
        sesionesInsert.push({
          cita_id: newCita.id,
          numero_sesion: i,
          estado: 'POR_PROGRAMAR',
          notas: '{}'
        });
      }
      await supabaseAdmin.from('sesiones').insert(sesionesInsert);
    }

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
    const { data: session } = await supabaseAdmin
      .from('sesiones')
      .select('*, cita:citas(empresa_id, cliente:clientes(nombre, email), servicio:servicios(nombre), empresa:empresas(nombre))')
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

    // Trigger testimonial email if session state changed to COMPLETADA
    if (data.estado === 'COMPLETADA' && session.estado !== 'COMPLETADA') {
      import('./email.service.js').then(({ emailService }) => {
        // @ts-ignore
        const { cliente, servicio, empresa } = session.cita;
        if (cliente && cliente.email) {
          emailService.sendTestimonialRequest({
            email: cliente.email,
            clientName: cliente.nombre || 'Cliente',
            serviceName: servicio ? servicio.nombre : 'Servicio',
            companyName: empresa ? empresa.nombre : 'AgendaPro'
          });
        }
      }).catch(e => console.error('Error loading emailService for testimonials:', e));
    }

    return result;
  },

  async scheduleSession(tenantId: string, sessionId: string, data: { date: string; time: number; employeeId: string }) {
    // 1. Validar la sesion y la cita padre
    const { data: session } = await supabaseAdmin
      .from('sesiones')
      .select('*, cita:citas(*)')
      .eq('id', sessionId)
      .single();

    // @ts-ignore
    if (!session || !session.cita || session.cita.empresa_id !== tenantId) {
      throw new Error("Sesión no encontrada o sin acceso");
    }

    if (session.estado === 'COMPLETADA') {
      throw new Error("Esta sesión ya está completada.");
    }

    let notasObj: any = {};
    if (session.notas) {
      try {
        notasObj = JSON.parse(session.notas);
      } catch (e) {
        notasObj = { observaciones: session.notas };
      }
    }

    // 2. Verificar disponibilidad (Bypass opcional si falla pero se forzó en la UI)
    const { cita: parentCita } = session as any;
    const slots = await this.getAvailableSlots(tenantId, parentCita.sucursal_id, parentCita.servicio_id, data.date);
    const matchingSlot = slots.find(s => s.minutesFromMidnight === data.time);
    const isAvailable = matchingSlot && matchingSlot.availableEmployeeIds.includes(data.employeeId);

    if (!isAvailable) {
      console.warn("SLOT_TAKEN warning: El horario puede estar ocupado, pero se forzará su programación.", data.time, data.employeeId);
    }

    const [year, month, day] = data.date.split('-').map(Number);
    const dt = new Date(year, month - 1, day);
    dt.setHours(Math.floor(data.time / 60), data.time % 60, 0, 0);

    let finalCitaId = notasObj.agendado_cita_id;

    if (finalCitaId) {
      // 3a. Update existing 'citas' row
      const { error: updateCitaError } = await supabaseAdmin
        .from('citas')
        .update({
          empleado_id: data.employeeId,
          fecha_hora: dt.toISOString()
        })
        .eq('id', finalCitaId);

      if (updateCitaError) throw new Error(updateCitaError.message);
    } else {
      // 3b. Create a new 'citas' row (hija)
      const { data: newCita, error: createError } = await supabaseAdmin
        .from('citas')
        .insert([{
          empresa_id: tenantId,
          sucursal_id: parentCita.sucursal_id,
          empleado_id: data.employeeId,
          cliente_id: parentCita.cliente_id,
          servicio_id: parentCita.servicio_id,
          fecha_hora: dt.toISOString(),
          estado: 'CONFIRMADA'
        }])
        .select()
        .single();

      if (createError) throw new Error(createError.message);
      finalCitaId = newCita.id;
    }

    // 4. Actualizar la sesión para conectarla con la nueva cita y marcar como PENDIENTE
    notasObj.agendado_cita_id = finalCitaId;
    notasObj.agendado_fecha = data.date;
    notasObj.agendado_hora = data.time;
    notasObj.agendado_empleado_id = data.employeeId;

    const { data: result, error: updateError } = await supabaseAdmin
      .from('sesiones')
      .update({
        estado: 'PENDIENTE',
        notas: JSON.stringify(notasObj)
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return result;
  },

  async rescueSessions(tenantId: string, citaId: string, total: number) {
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('sesiones')
      .select('id')
      .eq('cita_id', citaId);

    if (checkError) throw new Error(checkError.message);
    if (existing && existing.length >= total) return { count: 0, message: 'Sessions already exist' };

    const missingCount = total - (existing ? existing.length : 0);
    const toInsert = [];
    const startIndex = (existing ? existing.length : 0) + 1;

    for (let i = 0; i < missingCount; i++) {
      toInsert.push({
        cita_id: citaId,
        numero_sesion: startIndex + i,
        estado: 'POR_PROGRAMAR',
        notas: '{}'
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('sesiones')
      .insert(toInsert);

    if (insertError) throw new Error(insertError.message);
    return { count: missingCount, message: 'Sessions generated successfully' };
  }
};