import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

// --- Public / Client endpoints ---

// GET /api/testimonials (Public: only get approved)
router.get('/', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: testimonials, error } = await supabaseAdmin
        .from('testimonials')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10); // Maybe return latest 10

    if (error) return res.status(500).json({ error: error.message });
    res.json(testimonials || []);
});

// POST /api/testimonials (Client creates a new one)
router.post('/', async (req, res) => {
    const tenantId = getTenantId(req);
    const { client_name, client_image, text, rating } = req.body;

    if (!client_name || !text || !rating) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabaseAdmin
        .from('testimonials')
        .insert([{
            empresa_id: tenantId,
            client_name,
            client_image,
            text,
            rating,
            is_approved: false
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// --- Admin endpoints ---

// GET /api/testimonials/admin (Admin: get all, approved or not)
router.get('/admin', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: testimonials, error } = await supabaseAdmin
        .from('testimonials')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(testimonials || []);
});

// PUT /api/testimonials/:id/approve (Admin toggles approval)
router.put('/:id/approve', async (req, res) => {
    const tenantId = getTenantId(req);
    const { is_approved } = req.body;

    const { data, error } = await supabaseAdmin
        .from('testimonials')
        .update({ is_approved })
        .eq('id', req.params.id)
        .eq('empresa_id', tenantId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE /api/testimonials/:id (Admin deletes)
router.delete('/:id', async (req, res) => {
    const tenantId = getTenantId(req);

    const { error } = await supabaseAdmin
        .from('testimonials')
        .delete()
        .eq('id', req.params.id)
        .eq('empresa_id', tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

export default router;
