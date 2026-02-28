import { supabaseAdmin } from '../config/supabase';
import { appointmentService } from './appointment.service';

interface AiContext {
    tenantId: string;
    clientId: string;
    clientName: string;
    services: any[];
}

export const aiToolsDefinition = [
    {
        type: "function" as const,
        function: {
            name: "consultar_disponibilidad",
            description: "Consulta la disponibilidad de horarios para un servicio específico en una fecha.",
            parameters: {
                type: "object",
                properties: {
                    serviceName: { type: "string", description: "El nombre exacto o aproximado del servicio que el cliente quiere agendar." },
                    date: { type: "string", description: "Fecha en formato YYYY-MM-DD para consultar disponibilidad." }
                },
                required: ["serviceName", "date"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "agendar_cita",
            description: "Agenda una cita nueva en el calendario. Requiere haber consultado disponibilidad antes.",
            parameters: {
                type: "object",
                properties: {
                    serviceName: { type: "string", description: "El nombre exacto del servicio a agendar." },
                    date: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
                    timeString: { type: "string", description: "Hora en formato HH:MM (ejemplo 14:30)." }
                },
                required: ["serviceName", "date", "timeString"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "cancelar_cita",
            description: "Cancela una cita confirmada o pendiente del cliente.",
            parameters: {
                type: "object",
                properties: {
                    appointmentId: { type: "string", description: "ID de la cita a cancelar." }
                },
                required: ["appointmentId"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "consultar_mis_citas",
            description: "Consulta las citas activas o futuras del cliente actual para que el asistente pueda listárselas.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
];

export async function executeAiTool(toolCall: any, context: AiContext): Promise<string> {
    const args = JSON.parse(toolCall.function.arguments);

    // Resolvers
    const findService = (name: string) => {
        const lowerName = name.toLowerCase();
        return context.services.find(s => s.name.toLowerCase().includes(lowerName)) || context.services[0];
    };

    const getBranchId = async () => {
        const { data } = await supabaseAdmin.from('sucursales').select('id').eq('empresa_id', context.tenantId).limit(1).single();
        return data?.id;
    };

    switch (toolCall.function.name) {
        case 'consultar_disponibilidad': {
            try {
                const service = findService(args.serviceName);
                if (!service) return JSON.stringify({ error: "Servicio no encontrado en el catálogo." });
                const branchId = await getBranchId();
                if (!branchId) return JSON.stringify({ error: "Sede principal no encontrada." });

                const slots = await appointmentService.getAvailableSlots(context.tenantId, branchId, service.id, args.date);
                if (!slots || slots.length === 0) return JSON.stringify({ message: "No hay horarios disponibles para ese día." });

                return JSON.stringify({
                    message: "Horarios disponibles encontrados.",
                    slots_disponibles: slots.map(s => s.timeString)
                });
            } catch (error: any) {
                return JSON.stringify({ error: error.message });
            }
        }

        case 'agendar_cita': {
            try {
                const service = findService(args.serviceName);
                if (!service) return JSON.stringify({ error: "Servicio no encontrado." });
                const branchId = await getBranchId();
                if (!branchId) return JSON.stringify({ error: "Sede principal no encontrada." });

                const [hh, mm] = args.timeString.split(':').map(Number);
                const timeInMins = hh * 60 + mm;

                const newCita = await appointmentService.create({
                    tenantId: context.tenantId,
                    branchId: branchId,
                    serviceId: service.id,
                    clientId: context.clientId,
                    date: args.date,
                    time: timeInMins,
                    employeeId: 'any', // Auto-assign randomly among available
                    clientName: context.clientName
                });

                return JSON.stringify({ message: "Cita agendada exitosamente", cita_id: newCita.id });
            } catch (error: any) {
                if (error.message.includes('SLOT_TAKEN')) return JSON.stringify({ error: "El horario ya no está disponible, pide al cliente que elija otro." });
                return JSON.stringify({ error: error.message });
            }
        }

        case 'consultar_mis_citas': {
            try {
                const { data: citas } = await supabaseAdmin.from('citas')
                    .select('id, fecha_hora, estado, servicios(nombre)')
                    .eq('empresa_id', context.tenantId)
                    .eq('cliente_id', context.clientId)
                    .in('estado', ['CONFIRMADA', 'PENDIENTE'])
                    .gte('fecha_hora', new Date().toISOString())
                    .order('fecha_hora', { ascending: true });

                if (!citas || citas.length === 0) return JSON.stringify({ message: "El cliente no tiene citas futuras." });

                return JSON.stringify({
                    citas: citas.map(c => ({
                        id: c.id,
                        fecha_y_hora: c.fecha_hora,
                        servicio: (c.servicios as any)?.nombre,
                        estado: c.estado
                    }))
                });
            } catch (error: any) {
                return JSON.stringify({ error: error.message });
            }
        }

        case 'cancelar_cita': {
            try {
                await appointmentService.delete(context.tenantId, args.appointmentId);
                return JSON.stringify({ message: "Cita cancelada con éxito." });
            } catch (error: any) {
                return JSON.stringify({ error: error.message });
            }
        }

        default:
            return JSON.stringify({ error: "Función desconocida." });
    }
}
