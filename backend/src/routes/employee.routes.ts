import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

router.get('/', async (req, res) => {
    const tenantId = getTenantId(req);
    const { branchId } = req.query;

    let query = supabaseAdmin
        .from('empleados')
        .select('*')
        .eq('empresa_id', tenantId);

    if (branchId) {
        query = query.eq('sucursal_id', branchId);
    }

    const { data: employees, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json((employees || []).map(e => ({
        ...e,
        name: e.nombre,
        branchId: e.sucursal_id,
        role: e.role || 'Staff',
        avatar: e.avatar_url || '',
        serviceIds: e.service_ids || [],
        weeklySchedule: e.weekly_schedule || []
    })));
});

router.get('/:id', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: employee, error } = await supabaseAdmin
        .from('empleados')
        .select('*')
        .eq('id', req.params.id)
        .eq('empresa_id', tenantId)
        .single();

    if (error || !employee) return res.status(404).json({ error: 'Empleado no encontrado' });

    res.json({
        ...employee,
        name: employee.nombre,
        branchId: employee.sucursal_id,
        role: employee.role || 'Staff',
        avatar: employee.avatar_url || '',
        serviceIds: employee.service_ids || [],
        weeklySchedule: employee.weekly_schedule || []
    });
});

router.post('/', async (req, res) => {
    const tenantId = getTenantId(req);
    const { name, branchId, role, avatar, email, phone, serviceIds, weeklySchedule } = req.body;

    const { data: employee, error } = await supabaseAdmin
        .from('empleados')
        .insert([{
            empresa_id: tenantId,
            sucursal_id: branchId,
            nombre: name,
            email: email,
            telefono: phone,
            role: role || 'Staff',
            is_active: true,
            service_ids: serviceIds || [],
            weekly_schedule: weeklySchedule || [],
            avatar_url: avatar || ''
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
        ...employee,
        name: employee.nombre,
        branchId: employee.sucursal_id,
        role: role || 'Staff',
        avatar: avatar || '',
        serviceIds: employee.service_ids || [],
        weeklySchedule: employee.weekly_schedule || []
    });
});

router.put('/:id', async (req, res) => {
    const tenantId = getTenantId(req);
    const { name, branchId, email, phone, role, is_active, serviceIds, weeklySchedule, avatar } = req.body;

    // verify access
    const { data: existing, error: errExist } = await supabaseAdmin
        .from('empleados')
        .select('id')
        .eq('id', req.params.id)
        .eq('empresa_id', tenantId)
        .single();

    if (errExist || !existing) return res.status(404).json({ error: 'Empleado no encontrado' });

    const payload: any = {};
    if (name) payload.nombre = name;
    if (branchId) payload.sucursal_id = branchId;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.telefono = phone;
    if (role !== undefined) payload.role = role;
    if (is_active !== undefined) payload.is_active = is_active;
    if (serviceIds !== undefined) payload.service_ids = serviceIds;
    if (weeklySchedule !== undefined) payload.weekly_schedule = weeklySchedule;
    if (avatar !== undefined) payload.avatar_url = avatar;

    const { data: employee, error } = await supabaseAdmin
        .from('empleados')
        .update(payload)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        ...employee,
        name: employee.nombre,
        branchId: employee.sucursal_id,
        role: employee.role || 'Staff',
        avatar: employee.avatar_url || '',
        serviceIds: employee.service_ids || [],
        weeklySchedule: employee.weekly_schedule || []
    });
});

router.delete('/:id', async (req, res) => {
    const tenantId = getTenantId(req);
    const { error } = await supabaseAdmin
        .from('empleados')
        .delete()
        .eq('id', req.params.id)
        .eq('empresa_id', tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

export default router;