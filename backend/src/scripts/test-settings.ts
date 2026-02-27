import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabaseAdmin
        .from('configuraciones')
        .update({ chatbot_business_type: 'Test' })
        .eq('empresa_id', 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161')
        .select()
        .single();

    console.log("Error:", error);
    console.log("Data:", data);
}

test();
