import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

router.get('/', async (req, res) => {
  const tenantId = getTenantId(req);
  const { data: clients, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('empresa_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json((clients || []).map(c => ({
    ...c,
    name: c.nombre
  })));
});

router.post('/', async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, email, phone, auth_user_id } = req.body;

  try {
    // Check if exists
    const { data: existing } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('empresa_id', tenantId)
      .eq('email', email)
      .single();

    let client;
    if (existing) {
      const updateData: any = { nombre: name, telefono: phone };
      if (auth_user_id) updateData.auth_user_id = auth_user_id;

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      client = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .insert([{ empresa_id: tenantId, nombre: name, email, telefono: phone, auth_user_id }])
        .select()
        .single();
      if (error) throw error;
      client = data;
    }

    res.json({
      ...client,
      name: client.nombre
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Error gestionando cliente" });
  }
});

router.get('/:id', async (req, res) => {
  const tenantId = getTenantId(req);
  const { data: client, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId)
    .single();

  if (error || !client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ ...client, name: client.nombre });
});

router.put('/:id', async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, email, phone, auth_user_id } = req.body;

  const updateData: any = { nombre: name, email, telefono: phone };
  if (auth_user_id) updateData.auth_user_id = auth_user_id;

  const { data: client, error } = await supabaseAdmin
    .from('clientes')
    .update(updateData)
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...client, name: client.nombre });
});

router.delete('/:id', async (req, res) => {
  const tenantId = getTenantId(req);
  const { error } = await supabaseAdmin
    .from('clientes')
    .delete()
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;