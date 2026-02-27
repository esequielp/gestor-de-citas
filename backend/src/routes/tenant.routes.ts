import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();

// CRUD de Empresas (Tenants)
// Se protege opcionalmente con un middleware is-admin si el portal tuviera Súper Administrador.
// Por ahora dejamos expuesto el CRUD básico para cumplir la especificación del MVP.

router.get('/', async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('empresas').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Obtener info de la empresa actual (basado en el header de requireTenant)
router.get('/me', requireTenant, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const { data, error } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .eq('id', tenantId)
        .single();

    if (error || !data) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(data);
});

router.post('/', async (req: Request, res: Response) => {
    const { nombre, email, telefono } = req.body;

    // Create empresa
    const { data, error } = await supabaseAdmin
        .from('empresas')
        .insert([{ nombre, email, telefono }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Create default configuraciones
    await supabaseAdmin.from('configuraciones').insert([{ empresa_id: data.id }]);

    res.status(201).json(data);
});

router.put('/:id', async (req: Request, res: Response) => {
    const { nombre, email, telefono } = req.body;
    const { data, error } = await supabaseAdmin
        .from('empresas')
        .update({ nombre, email, telefono })
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.delete('/:id', async (req, res) => {
    const { error } = await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

export default router;
