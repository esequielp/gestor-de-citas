import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();

// Endpoint for manual processing
router.post('/process', requireTenant, async (req: Request, res: Response) => {
    try {
        const tenantId = getTenantId(req);
        // Find pending reminders
        const { data: reminders, error } = await supabaseAdmin
            .from('recordatorios')
            .select('*, cita:citas(cliente:clientes(nombre, telefono), fecha_hora, servicio:servicios(nombre))')
            .eq('empresa_id', tenantId)
            .eq('estado', 'PENDIENTE')
            .lte('scheduled_at', new Date().toISOString());

        if (error) throw error;

        let count = 0;
        if (reminders && reminders.length > 0) {
            for (const rem of reminders) {
                // Simulated n8n call
                console.log(`[Webhook n8n] Sending ${rem.tipo} to ${rem.cita.cliente.telefono}`);

                // Mark sent
                await supabaseAdmin.from('recordatorios')
                    .update({ estado: 'ENVIADO' })
                    .eq('id', rem.id);
                count++;
            }
        }

        res.json({ success: true, message: `Procesados ${count} recordatorios` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/n8n', async (req: Request, res: Response) => {
    // Webhook externo, no requiere tenant middleware ya que n8n trae su api key
    console.log('[Webhook n8n payload received]:', req.body);
    res.json({ success: true, message: 'Webhook n8n consumido correctamente' });
});

export default router;