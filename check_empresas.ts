import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data, error } = await supabaseAdmin.from('empresas').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No data in empresas table, cannot infer columns from data. Try using pg_meta.');
        }
    }
}
check();
