import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Fix path to .env when running from script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const branchImages = [
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80',
    'https://images.unsplash.com/photo-1629904853716-f0bc54eea481?w=800&q=80',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    'https://images.unsplash.com/photo-1620078864771-419b4b0e5ee4?w=800&q=80'
];

const serviceImages = [
    'https://images.unsplash.com/photo-1512496015851-a1fbcf69bca1?w=800&q=80',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71c9?w=800&q=80',
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80',
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&q=80'
];

const avatarImages = [
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80'
];

async function run() {
    console.log('Seeding images...');

    // Branches
    const { data: sucursales } = await supabaseAdmin.from('sucursales').select('id');
    if (sucursales) {
        for (let i = 0; i < sucursales.length; i++) {
            await supabaseAdmin.from('sucursales')
                .update({ image_url: branchImages[i % branchImages.length] })
                .eq('id', sucursales[i].id);
        }
        console.log(`Updated ${sucursales.length} branches.`);
    }

    // Services
    const { data: servicios } = await supabaseAdmin.from('servicios').select('id');
    if (servicios) {
        for (let i = 0; i < servicios.length; i++) {
            await supabaseAdmin.from('servicios')
                .update({ image_url: serviceImages[i % serviceImages.length] })
                .eq('id', servicios[i].id);
        }
        console.log(`Updated ${servicios.length} services.`);
    }

    // Employees
    const { data: empleados } = await supabaseAdmin.from('empleados').select('id');
    if (empleados) {
        for (let i = 0; i < empleados.length; i++) {
            await supabaseAdmin.from('empleados')
                .update({ avatar_url: avatarImages[i % avatarImages.length] })
                .eq('id', empleados[i].id);
        }
        console.log(`Updated ${empleados.length} employees.`);
    }
}

run().catch(console.error);
