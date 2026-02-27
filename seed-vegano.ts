import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    console.log('URL:', supabaseUrl);
    console.log('KEY:', supabaseKey ? 'PRESENT' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedVegano() {
    console.log('🌱 Creando empresa Vegano Cosmetics...');

    try {
        const { data: empresa, error: empErr } = await supabase
            .from('empresas')
            .insert([{
                nombre: 'Vegano Cosmetics',
                email: 'contacto@veganocosmetics.com',
                telefono: '3042859401'
            }])
            .select()
            .single();

        if (empErr) {
            console.error('Error insertando empresa:', empErr);
            throw empErr;
        }
        const empresaId = empresa.id;
        console.log('✅ Empresa creada:', empresaId);

        await supabase.from('configuraciones').insert([{ empresa_id: empresaId }]);

        const { data: sucursales, error: sucErr } = await supabase
            .from('sucursales')
            .insert([
                { empresa_id: empresaId, nombre: 'Sede Principal Envigado', direccion: 'Calle 34 Sur #47-59, Envigado', telefono: '3042859401', latitude: 6.1664, longitude: -75.5862, image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80' },
                { empresa_id: empresaId, nombre: 'Sede Medellín - Laureles', direccion: 'Av. Nutibara #74-20, Medellín', telefono: '3042859402', latitude: 6.2486, longitude: -75.5902, image_url: 'https://images.unsplash.com/photo-1527799822394-46a855837e55?auto=format&fit=crop&w=400&q=80' },
                { empresa_id: empresaId, nombre: 'Sede Sabaneta', direccion: 'Calle 75 Sur #45-10, Sabaneta', telefono: '3042859403', latitude: 6.1517, longitude: -75.6152, image_url: 'https://images.unsplash.com/photo-1481501940778-c8bb63e376c5?auto=format&fit=crop&w=400&q=80' }
            ])
            .select();
        if (sucErr) throw sucErr;

        const { data: servs, error: serErr } = await supabase
            .from('servicios')
            .insert([
                { empresa_id: empresaId, nombre: 'Alisado Orgánico Vegano PRO', duracion_minutos: 180, precio: 250000, is_active: true, descripcion: 'Liso perfecto y orgánico.' },
                { empresa_id: empresaId, nombre: 'Terapia BIOELIXIR (Rubios)', duracion_minutos: 210, precio: 280000, is_active: true, descripcion: 'Protección para rubios.' },
                { empresa_id: empresaId, nombre: 'Vital Plex Rescue (Fase 1/3)', duracion_minutos: 90, precio: 60000, is_active: true, descripcion: 'Reconstrucción capilar profunda.' }
            ])
            .select();
        if (serErr) throw serErr;

        const { error: empErr2 } = await supabase
            .from('empleados')
            .insert([
                { empresa_id: empresaId, sucursal_id: sucursales[0].id, nombre: 'Valentina Ramos', email: 'valentina@vegano.com', is_active: true },
                { empresa_id: empresaId, sucursal_id: sucursales[1].id, nombre: 'Camila Montoya', email: 'camila@vegano.com', is_active: true },
                { empresa_id: empresaId, sucursal_id: sucursales[2].id, nombre: 'Sofia Alzate', email: 'sofia@vegano.com', is_active: true }
            ]);
        if (empErr2) throw empErr2;

        console.log('\n✅ SEED COMPLETADO EXITOSAMENTE');
        console.log('------------------------------');
        console.log('EMPRESA_ID:', empresaId);
        console.log('URL DEMO:', `http://localhost:3000/?tenantId=${empresaId}`);
        console.log('------------------------------');
    } catch (err) {
        console.error('❌ ERROR DURANTE EL SEED:', err);
        process.exit(1);
    }
}

seedVegano();
