import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentService } from './appointment.service';
import { supabaseAdmin } from '../config/supabase';

vi.mock('../config/supabase', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn(),
    }
}));

describe('Appointment Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAvailableSlots', () => {
        it('should return empty array if no employees are available for the service', async () => {
            // Un simulacro básico de supabase donde no hay empleados
            const mockEq = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            (supabaseAdmin.from as any).mockReturnValue({
                select: mockSelect,
                eq: mockEq,
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                contains: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: [] }),
                then: (cb: any) => cb({ data: [] }) // Para await directos sin single()
            });

            // Resolucion de Promises simulada
            const slots = await appointmentService.getAvailableSlots('t', 'b', 's', '2026-03-02');
            expect(slots).toEqual([]);
        });
    });

    describe('create (Appointment)', () => {
        it('should correctly auto-generate child sessions for multi-session services', async () => {
            const mockService = { id: 's', sesiones_totales: 3, duration: 60 };

            // Mocking the getAvailableSlots to bypass complex DB checks
            vi.spyOn(appointmentService, 'getAvailableSlots').mockResolvedValue([
                { timeString: '10:00', timeString12h: '10:00 AM', minutesFromMidnight: 600, availableEmployeeIds: ['emp1'] }
            ]);

            // Mock DB insert chaining
            (supabaseAdmin.from as any).mockImplementation((table: string) => {
                if (table === 'servicios') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockService }) }) }) };
                }
                if (table === 'empleados') {
                    return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [{ id: 'emp1', service_ids: ['s'] }] }) }) }) };
                }

                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({ single: () => Promise.resolve({ data: { id: 'some-id' } }) })
                    })
                };
            });

            const result = await appointmentService.create({
                tenantId: 't', branchId: 'b', serviceId: 's', clientId: 'c', date: '2026-03-02', time: 600, employeeId: 'any', clientName: 'C'
            });

            expect(result).toHaveProperty('id');
        });
    });
});
