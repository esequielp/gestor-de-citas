import { supabaseAdmin } from '../config/supabase';
import { appointmentService } from '../services/appointment.service';
import { clientController } from '../controllers/client.controller';

async function testBookingCreate() {
    const tenantId = 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161';

    try {
        const branchId = 'b147ada4-75d2-4f59-85e8-3c97b0361917'; // Laureles
        const serviceId = 'aaaa0001-0000-0000-0000-000000000001'; // Nutrición
        const employeeId = 'bbbb0001-0000-0000-0000-000000000001'; // Laura
        const clientId = 'cb1a20ab-d82e-4d2c-ac34-64ecb0afb161'; // Fake client id, might not exist but lets see if DB complains

        const dt = new Date('2026-02-27T08:00:00');
        console.log("Creating point:", dt);

        // First, maybe create client? 
        // Just try appointmentService.create directly 
        const res = await appointmentService.create({
            tenantId,
            branchId,
            serviceId,
            employeeId, // directly
            clientId,   // fake
            date: '2026-02-27',
            time: 8 * 60 // 480
        });
        console.log("Result:", res);
    } catch (e: any) {
        console.log("Error inside appointmentService.create:", e.message);
    }
}

testBookingCreate();
