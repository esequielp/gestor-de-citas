import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan credenciales de Supabase');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function main() {
    console.log('Iniciando script de seeding para Vegano Cosmetics...');
    const tenantIdentifier = 'vegano';

    // Resolve Tenant ID
    const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .ilike('nombre', `%${tenantIdentifier}%`)
        .single();

    if (tenantError || !tenant) {
        console.log(`No se encontró el tenant para ${tenantIdentifier}. Intenta crear la empresa primero.`);
        return;
    }

    const tenantId = tenant.id;
    console.log(`Tenant ID resuelto: ${tenantId} (${tenant.nombre})`);

    // 1. Create Branches
    const branchesData = [
        { empresa_id: tenantId, nombre: 'Sabaneta', direccion: 'Cra 45 # 77-Sur 12, Sabaneta', telefono: '3001234567', latitude: 6.15, longitude: -75.61 },
        { empresa_id: tenantId, nombre: 'Itagüí', direccion: 'Calle 51 # 50-25, Itagüí', telefono: '3001234568', latitude: 6.17, longitude: -75.60 },
        { empresa_id: tenantId, nombre: 'Envigado', direccion: 'Cra 43 # 38 Sur-50, Envigado', telefono: '3001234569', latitude: 6.175, longitude: -75.59 }
    ];

    console.log('Creando sucursales...');
    let insertedBranches = [];
    for (const b of branchesData) {
        const { data, error } = await supabaseAdmin.from('sucursales').insert([b]).select().single();
        if (error) {
            console.error('Error insertando sucursal:', b.nombre, error.message);
        } else {
            insertedBranches.push(data);
            console.log(`Sucursal creada: ${data.nombre} (${data.id})`);
        }
    }

    if (insertedBranches.length === 0) {
        console.log('No se pudieron crear sucursales. Recuperando existentes para asociar empleados y servicios.');
        const { data } = await supabaseAdmin.from('sucursales').select('*').eq('empresa_id', tenantId);
        insertedBranches = data || [];
    }

    // 2. Create Services
    const servicesData = [
        { empresa_id: tenantId, nombre: 'Limpieza Facial Profunda Vegana', descripcion: 'Tratamiento facial profundo con productos 100% orgánicos y libres de crueldad. Ideal para pieles sensibles.', duracion_minutos: 60, precio: 95000, is_active: true },
        { empresa_id: tenantId, nombre: 'Lifting de Pestañas Cruelty-Free', descripcion: 'Realza tu mirada de forma natural con técnicas y materiales veganos y orgánicos, protegiendo tus pestañas reales.', duracion_minutos: 45, precio: 75000, is_active: true },
        { empresa_id: tenantId, nombre: 'Masaje Relajante con Aromaterapia Orgánica', descripcion: 'Terapia relajante con mezclas de aceites esenciales 100% veganos traídos directamente de la naturaleza en Envigado.', duracion_minutos: 90, precio: 120000, is_active: true },
        { empresa_id: tenantId, nombre: 'Diseño de Cejas con Henna Natural', descripcion: 'Estructuración perfecta para tu rostro usando henna completamente vegana, con un efecto duradero.', duracion_minutos: 30, precio: 45000, is_active: true },
        { empresa_id: tenantId, nombre: 'Manicura Spa Vegana', descripcion: 'Tratamiento completo spa para manos y uñas. Esmaltado tradicional o semipermanente de marcas certificadas cruelty-free.', duracion_minutos: 60, precio: 55000, is_active: true }
    ];

    console.log('\nCreando servicios...');
    let insertedServices = [];
    for (const s of servicesData) {
        const { data, error } = await supabaseAdmin.from('servicios').insert([s]).select().single();
        if (error) {
            console.error('Error insertando servicio:', s.nombre, error.message);
        } else {
            insertedServices.push(data);
            console.log(`Servicio creado: ${data.nombre}`);
        }
    }

    if (insertedServices.length === 0) {
        const { data } = await supabaseAdmin.from('servicios').select('*').eq('empresa_id', tenantId);
        insertedServices = data || [];
    }

    // 3. Create Employees
    if (insertedBranches.length === 0) {
        console.error("No hay sucursales, no puedo crear empleados. Terminando script.");
        return;
    }

    const branchSabaneta = insertedBranches.find(b => b.nombre === 'Sabaneta') || insertedBranches[0];
    const branchItagui = insertedBranches.find(b => b.nombre === 'Itagüí') || insertedBranches[1] || insertedBranches[0];
    const branchEnvigado = insertedBranches.find(b => b.nombre === 'Envigado') || insertedBranches[2] || insertedBranches[0];

    const employeesData = [
        { empresa_id: tenantId, sucursal_id: branchSabaneta.id, nombre: 'Valeria López', email: 'valeria@veganocosmetics.com', telefono: '3201112233', is_active: true },
        { empresa_id: tenantId, sucursal_id: branchSabaneta.id, nombre: 'Ana Suárez', email: 'ana@veganocosmetics.com', telefono: '3201112234', is_active: true },
        { empresa_id: tenantId, sucursal_id: branchItagui.id, nombre: 'Camila Rojas', email: 'camila@veganocosmetics.com', telefono: '3201112235', is_active: true },
        { empresa_id: tenantId, sucursal_id: branchEnvigado.id, nombre: 'Mariana Quintero', email: 'mariana@veganocosmetics.com', telefono: '3201112236', is_active: true }
    ];

    console.log('\nCreando empleados y asociando servicios al azar...');
    let insertedEmployees = [];
    for (const e of employeesData) {
        const { data: emp, error } = await supabaseAdmin.from('empleados').insert([e]).select().single();
        if (error) {
            console.error('Error creando empleado:', e.nombre, error.message);
        } else {
            insertedEmployees.push(emp);
            console.log(`Empleado creado: ${emp.nombre} en sucursal ${e.sucursal_id}`);

            // Randomly assign 2-4 services to this employee
            const numServices = Math.floor(Math.random() * 3) + 2;
            const shuffled = [...insertedServices].sort(() => 0.5 - Math.random());
            const selectedServices = shuffled.slice(0, numServices).map(s => s.id);

            const { error: updateError } = await supabaseAdmin.from('empleados')
                .update({ service_ids: selectedServices })
                .eq('id', emp.id);

            if (updateError) {
                console.error('Error asociando servicio al empleado:', updateError.message);
            } else {
                console.log(`  Asociados ${selectedServices.length} servicios para ${emp.nombre}`);
            }
        }
    }

    console.log('\n¡Proceso de Seed finalizado con éxito!');
}

main().catch(console.error);
