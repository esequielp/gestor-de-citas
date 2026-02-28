import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase connection to sesiones table...');
    const { data, error } = await supabaseAdmin
        .from('sesiones')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No data found in sesiones, but table exists.');
            // Try to get column information differently
            const { data: cols, error: colErr } = await supabaseAdmin.rpc('get_table_columns', { tname: 'sesiones' });
            if (colErr) console.log('RPC check failed too');
            else console.log('Columns from RPC:', cols);
        }
    }
}

test();
