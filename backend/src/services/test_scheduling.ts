import 'dotenv/config';
import { supabaseAdmin } from '../config/supabase';
import { appointmentService } from './appointment.service';
import { executeAiTool } from './ai.tools';

async function runTests() {
    console.log('--- EMPEZANDO PRUEBAS UNITARIAS ---');

    console.log('\n[✔] 1. Probando conexión a BD y recuperación de tenants...');
    const { data: empresa, error: empErr } = await supabaseAdmin.from('empresas').select('id, nombre').limit(1).single();
    if (empErr || !empresa) {
        console.error('❌ Error obteniendo empresa:', empErr);
        return;
    }
    console.log(`Empresa de prueba: ${empresa.nombre} (${empresa.id})`);

    const tenantId = empresa.id;

    // Buscar una sucursal
    const { data: sucursal } = await supabaseAdmin.from('sucursales').select('id').eq('empresa_id', tenantId).limit(1).single();
    if (!sucursal) {
        console.error('❌ Error: No hay sucursales disponibles');
        return;
    }

    // Buscar un servicio activo
    const { data: service } = await supabaseAdmin.from('servicios').select('id, nombre').eq('empresa_id', tenantId).eq('is_active', true).limit(1).single();
    if (!service) {
        console.error('❌ Error: No hay servicios disponibles');
        return;
    }
    console.log(`Servicio de prueba: ${service.nombre} (${service.id})`);

    // Fecha de prueba: 2 de Marzo de 2026 (Lunes)
    const dateStr = '2026-03-02';
    console.log(`\n[✔] 2. Probando Agendamiento Web -> appointmentService.getAvailableSlots para ${dateStr}`);

    try {
        const slots = await appointmentService.getAvailableSlots(tenantId, sucursal.id, service.id, dateStr);
        if (slots.length > 0) {
            console.log(`✅ OK: Se encontraron ${slots.length} espacios disponibles.`);
            console.log(`Primer espacio disponible: ${slots[0].timeString}`);
        } else {
            console.log(`⚠️ Advertencia: No hay espacios, revisar horario de empleados, pero la función corrió exitosamente.`);
        }
    } catch (e: any) {
        console.error('❌ FALLÓ getAvailableSlots:', e.message);
    }

    // Intentar buscar un cliente, si no hay, crear uno de prueba
    let realClient;
    const { data: clientData } = await supabaseAdmin.from('clientes').select('id').eq('empresa_id', tenantId).limit(1).single();

    if (!clientData) {
        console.log('No se encontró cliente, creando uno de prueba...');
        const { data: newClient, error: createErr } = await supabaseAdmin.from('clientes').insert([
            { empresa_id: tenantId, nombre: 'Test Bot User', telefono: '5555555555' }
        ]).select('id').single();

        if (createErr || !newClient) {
            console.error('❌ Error creando cliente de prueba:', createErr);
            return;
        }
        realClient = newClient;
    } else {
        realClient = clientData;
    }

    console.log('\n[✔] 3. Probando el Agente de IA -> Función "consultar_disponibilidad"');

    const context = {
        tenantId: tenantId,
        clientId: realClient.id,
        clientName: 'Cliente Prueba',
        services: [
            { id: service.id, name: service.nombre, description: 'Servicio de prueba' }
        ]
    };

    const toolCallPayload = {
        function: {
            name: 'consultar_disponibilidad',
            arguments: JSON.stringify({
                serviceName: service.nombre,
                date: dateStr
            })
        }
    };

    try {
        const result = await executeAiTool(toolCallPayload, context);
        console.log(`Respuesta del Agente (Consulta): ${result}`);
        if (result.includes('error')) {
            console.error('❌ FALLÓ consultar_disponibilidad por un error interno.');
        } else if (result.includes('slots_disponibles')) {
            console.log(`✅ OK: El tool del Agente respondió correctamente con formato estructurado.`);

            // Si hay slots, probamos a agendar uno
            const slotsObj = JSON.parse(result);
            if (slotsObj.slots_disponibles && slotsObj.slots_disponibles.length > 0) {
                const timeStr = slotsObj.slots_disponibles[0]; // Ejemplo: "09:00"
                console.log(`\n[✔] 4. Probando Agendamiento IA -> Función "agendar_cita" para las ${timeStr}`);

                const agendaPayload = {
                    function: {
                        name: 'agendar_cita',
                        arguments: JSON.stringify({
                            serviceName: service.nombre,
                            date: dateStr,
                            timeString: timeStr
                        })
                    }
                };

                const agendaResult = await executeAiTool(agendaPayload, context);
                console.log(`Respuesta del Agente (Agendar): ${agendaResult}`);
                if (agendaResult.includes('exitosamente') || agendaResult.includes('cita_id')) {
                    console.log(`✅ OK: Cita agendada correctamente vía IA.`);
                } else {
                    console.error('❌ FALLÓ agendar_cita:', agendaResult);
                }
            }
        } else {
            console.log(`⚠️ Resultado inesperado: ${result}`);
        }
    } catch (e: any) {
        console.error('❌ FALLÓ executeAiTool:', e.message);
    }

    console.log('\n--- PRUEBAS FINALIZADAS ---');
    process.exit(0);
}

runTests();
