import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

// Listar excepciones de un empleado
router.get('/:employeeId', async (req, res) => {
    const tenantId = getTenantId(req);
    const { employeeId } = req.params;
    const { from, to } = req.query;

    let query = supabaseAdmin
        .from('employee_exceptions')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('empleado_id', employeeId)
        .order('fecha', { ascending: true });

    if (from) query = query.gte('fecha', from as string);
    if (to) query = query.lte('fecha', to as string);

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// Crear o actualizar excepción (upsert por empleado+fecha)
router.post('/', async (req, res) => {
    const tenantId = getTenantId(req);
    const { empleado_id, fecha, tipo, ranges, motivo } = req.body;

    if (!empleado_id || !fecha || !tipo) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: empleado_id, fecha, tipo' });
    }

    const { data, error } = await supabaseAdmin
        .from('employee_exceptions')
        .upsert({
            empresa_id: tenantId,
            empleado_id,
            fecha,
            tipo,
            ranges: ranges || [],
            motivo: motivo || null
        }, { onConflict: 'empleado_id,fecha' })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Eliminar excepción
router.delete('/:id', async (req, res) => {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const { error } = await supabaseAdmin
        .from('employee_exceptions')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

export default router;
