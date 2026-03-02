import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAiTool } from './ai.tools';
import { appointmentService } from './appointment.service';
import { supabaseAdmin } from '../config/supabase';

// Mock the dependencies
vi.mock('./appointment.service', () => ({
    appointmentService: {
        getAvailableSlots: vi.fn(),
        create: vi.fn(),
    }
}));

vi.mock('../config/supabase', () => ({
    supabaseAdmin: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'branch-1' } }),
        })),
    }
}));

describe('AI Tools (executeAiTool)', () => {
    const mockContext = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientName: 'Test Client',
        services: [
            { id: 'serv-1', name: 'Corte de Cabello' },
            { id: 'serv-2', name: 'Barba' }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should consult availability successfully handling valid services', async () => {
        const toolCall = {
            function: {
                name: 'consultar_disponibilidad',
                arguments: JSON.stringify({ serviceName: 'Corte', date: '2026-03-02' })
            }
        };

        const mockSlots = [{ timeString: '10:00' }, { timeString: '11:00' }];
        (appointmentService.getAvailableSlots as any).mockResolvedValue(mockSlots);

        const responseString = await executeAiTool(toolCall, mockContext);
        const response = JSON.parse(responseString);

        expect(appointmentService.getAvailableSlots).toHaveBeenCalledWith(
            'tenant-123',
            'branch-1',
            'serv-1', // Found by partial name match
            '2026-03-02'
        );
        expect(response.message).toBe("Horarios disponibles encontrados.");
        expect(response.slots_disponibles).toEqual(['10:00', '11:00']);
    });

    it('should return an error string if no branch is found', async () => {
        const toolCall = {
            function: {
                name: 'consultar_disponibilidad',
                arguments: JSON.stringify({ serviceName: 'Corte', date: '2026-03-02' })
            }
        };

        // Mock no branch
        (supabaseAdmin.from as any).mockImplementationOnce(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
        }));

        const responseString = await executeAiTool(toolCall, mockContext);
        expect(JSON.parse(responseString).error).toBe("Sede principal no encontrada.");
    });

    it('should book an appointment when agendar_cita is called', async () => {
        const toolCall = {
            function: {
                name: 'agendar_cita',
                arguments: JSON.stringify({ serviceName: 'Barba', date: '2026-03-02', timeString: '14:30' })
            }
        };

        (appointmentService.create as any).mockResolvedValue({ id: 'new-cita-id' });

        const responseString = await executeAiTool(toolCall, mockContext);
        const response = JSON.parse(responseString);

        expect(appointmentService.create).toHaveBeenCalledWith({
            tenantId: 'tenant-123',
            branchId: 'branch-1',
            serviceId: 'serv-2',
            clientId: 'client-123',
            date: '2026-03-02',
            time: 14 * 60 + 30, // 870
            employeeId: 'any',
            clientName: 'Test Client'
        });
        expect(response.message).toBe("Cita agendada exitosamente");
        expect(response.cita_id).toBe("new-cita-id");
    });

    it('should handle SLOT_TAKEN error when booking an appointment', async () => {
        const toolCall = {
            function: {
                name: 'agendar_cita',
                arguments: JSON.stringify({ serviceName: 'Barba', date: '2026-03-02', timeString: '14:30' })
            }
        };

        (appointmentService.create as any).mockRejectedValue(new Error('SLOT_TAKEN'));

        const responseString = await executeAiTool(toolCall, mockContext);
        const response = JSON.parse(responseString);

        expect(response.error).toBe("El horario ya no está disponible, pide al cliente que elija otro.");
    });

    it('should cancel an appointment successfully', async () => {
        const toolCall = {
            function: {
                name: 'cancelar_cita',
                arguments: JSON.stringify({ appointmentId: 'cita-123' })
            }
        };

        // For canceling, appointmentService.delete needs to be mocked if it isn't already
        appointmentService.delete = vi.fn().mockResolvedValue(true);

        const responseString = await executeAiTool(toolCall, mockContext);
        const response = JSON.parse(responseString);

        expect(appointmentService.delete).toHaveBeenCalledWith('tenant-123', 'cita-123');
        expect(response.message).toBe("Cita cancelada con éxito.");
    });
});
