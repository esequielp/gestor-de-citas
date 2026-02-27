import { dataService } from '../../services/dataService';
import { chatApiService } from '../../src/services/chatApiService';
import { appointmentService } from '../services/appointment.service';
import { supabaseAdmin } from '../config/supabase';

// Helper to mock tenant context
const fakeTenantId = 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161'; // vegano

async function testBooking() {
    try {
        const { data: branch } = await supabaseAdmin.from('sucursales').select('*').eq('empresa_id', fakeTenantId).limit(1).single();
        const { data: service } = await supabaseAdmin.from('servicios').select('*').eq('empresa_id', fakeTenantId).limit(1).single();

        console.log(`Branch: ${branch.nombre} (${branch.id})`);
        console.log(`Service: ${service.nombre} (${service.id})`);

        const { data: employees } = await supabaseAdmin.from('empleados').select('*').eq('sucursal_id', branch.id).eq('empresa_id', fakeTenantId);
        console.log("Employees service_ids:", employees?.map(e => ({ id: e.id, name: e.nombre, service_ids: e.service_ids })));

        const date = '2026-02-27';
        console.log(`Checking slots for ${date}...`);

        const slots = await appointmentService.getAvailableSlots(fakeTenantId, branch.id, service.id, date);
        console.log(`Slots found: `, slots);

        if (slots.length > 0) {
            const slot = slots[0];
            const timeMinutes = slot.minutesFromMidnight;
            console.log(`Trying to book at ${slot.timeString12h} (${timeMinutes} mins)`);

            const appointmentData = {
                tenantId: fakeTenantId,
                branchId: branch.id,
                serviceId: service.id,
                employeeId: 'any',
                clientId: 'fake-client-id-that-does-not-exist',
                date: date,
                time: timeMinutes
            };

            try {
                const result = await appointmentService.create(appointmentData as any);
                console.log("Appointment created successfully:", result);
            } catch (err: any) {
                console.error("Failed to create appointment:", err.message);
            }
        }
    } catch (e: any) {
        console.error("Test error:", e.message);
    }
}

testBooking();
