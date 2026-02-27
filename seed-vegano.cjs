const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciales faltantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🌱 Iniciando seed...');
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

        if (empErr) throw empErr;
        const empresaId = empresa.id;
        console.log('✅ Empresa:', empresaId);

        await supabase.from('configuraciones').insert([{ empresa_id: empresaId }]);

        const { data: sucs, error: sucErr } = await supabase
            .from('sucursales')
            .insert([
                { empresa_id: empresaId, nombre: 'Sede Envigado', direccion: 'Calle 34 Sur #47-59', telefono: '3042859401', latitude: 6.1664, longitude: -75.5862, image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400' },
                { empresa_id: empresaId, nombre: 'Sede Laureles', direccion: 'Av. Nutibara #74-20', telefono: '3042859402', latitude: 6.2486, longitude: -75.5902, image_url: 'https://images.unsplash.com/photo-1527799822394-46a855837e55?w=400' },
                { empresa_id: empresaId, nombre: 'Sede Sabaneta', direccion: 'Calle 75 Sur #45-10', telefono: '3042859403', latitude: 6.1517, longitude: -75.6152, image_url: 'https://images.unsplash.com/photo-1481501940778-c8bb63e376c5?w=400' }
            ])
            .select();
        if (sucErr) throw sucErr;

        const { error: serErr } = await supabase
            .from('servicios')
            .insert([
                { empresa_id: empresaId, nombre: 'Alisado Vegano PRO', duracion_minutos: 180, precio: 250000, is_active: true, descripcion: 'Liso orgánico.' },
                { empresa_id: empresaId, nombre: 'BIOELIXIR Rubios', duracion_minutos: 210, precio: 280000, is_active: true, descripcion: 'Cuidado rubios.' },
                { empresa_id: empresaId, nombre: 'Vital Plex (Sesión 1/3)', duracion_minutos: 90, precio: 60000, is_active: true, descripcion: 'Reconstrucción.' }
            ]);
        if (serErr) throw serErr;

        const { error: empErr2 } = await supabase
            .from('empleados')
            .insert([
                { empresa_id: empresaId, sucursal_id: sucs[0].id, nombre: 'Valentina Ramos', email: 'valentina@vegano.com', is_active: true },
                { empresa_id: empresaId, sucursal_id: sucs[1].id, nombre: 'Camila Montoya', email: 'camila@vegano.com', is_active: true },
                { empresa_id: empresaId, sucursal_id: sucs[2].id, nombre: 'Sofia Alzate', email: 'sofia@vegano.com', is_active: true }
            ]);
        if (empErr2) throw empErr2;

        console.log('✅ SEED OK. ID:', empresaId);
    } catch (e) {
        console.error('❌ ERROR:', e);
        process.exit(1);
    }
}
run();
