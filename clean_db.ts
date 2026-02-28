import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanDB() {
    console.log('Borrando citas...');
    const { error: err1 } = await supabaseAdmin.from('citas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.error('Error borrando citas:', err1);

    console.log('Borrando sesiones...');
    const { error: err2 } = await supabaseAdmin.from('sesiones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Error borrando sesiones:', err2);

    // Also delete from sesiones_cita which I think is what it's called now?
    // Let's check from 'sesiones_cita' if it exists
    const { error: err3 } = await supabaseAdmin.from('sesiones_cita').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.log('sesiones_cita mig no found or error:', err3.message);

    console.log('Limpieza completada.');
}

cleanDB();
