import { supabaseAdmin } from '../config/supabase';

async function logEmployees() {
    const fakeTenantId = 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161';
    const { data: employees } = await supabaseAdmin.from('empleados').select('id, nombre, service_ids, is_active, sucursal_id, weekly_schedule').eq('empresa_id', fakeTenantId);
    console.log(JSON.stringify(employees, null, 2));
}

logEmployees();
