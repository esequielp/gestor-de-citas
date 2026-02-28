import { supabaseAdmin } from './backend/dist/config/supabase.js'; // Assuming it's compiled or we can use ts-node
// Or just use the tsx thing
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabaseAdmin
        .from('sesiones')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

test();
