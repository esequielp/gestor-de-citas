import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { getTenantId } from '../middleware/tenant.js';

export const branchController = {
  async getAll(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { data, error } = await supabaseAdmin
        .from('sucursales')
        .select('*')
        .eq('empresa_id', tenantId);

      if (error) throw error;
      res.json((data || []).map(b => ({
        ...b,
        name: b.nombre,
        address: b.direccion,
        lat: b.latitude,
        lng: b.longitude,
        phone: b.telefono,
        serviceIds: b.service_ids || [],
        image: b.image_url || ''
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { nombre, direccion, telefono, latitude, longitude, serviceIds, image } = req.body;
      const { data, error } = await supabaseAdmin
        .from('sucursales')
        .insert([{
          empresa_id: tenantId,
          nombre: nombre || req.body.name,
          direccion: direccion || req.body.address,
          telefono: telefono || req.body.phone,
          latitude: latitude || req.body.lat,
          longitude: longitude || req.body.lng,
          service_ids: serviceIds || [],
          image_url: image || ''
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({
        ...data,
        name: data.nombre,
        address: data.direccion,
        lat: data.latitude,
        lng: data.longitude,
        phone: data.telefono,
        serviceIds: data.service_ids || [],
        image: data.image_url || ''
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getServices(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      // Basic check
      const { data: sucursal, error: errSuc } = await supabaseAdmin
        .from('sucursales')
        .select('id')
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .single();

      if (errSuc || !sucursal) {
        return res.status(404).json({ error: 'Sucursal no encontrada' });
      }

      // Normally many-to-many. For now return all tenant active services
      const { data, error } = await supabaseAdmin
        .from('servicios')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      res.json((data || []).map(s => ({
        ...s,
        name: s.nombre,
        description: s.descripcion,
        price: s.precio,
        duration: s.duracion_minutos,
        active: s.is_active
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getEmployees(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from('empleados')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('sucursal_id', id);

      if (error) throw error;
      res.json((data || []).map(e => ({
        ...e,
        name: e.nombre,
        branchId: e.sucursal_id,
        role: e.role || 'Staff',
        avatar: e.avatar_url || '',
        avatarUrl: e.avatar_url || '',
        serviceIds: e.service_ids || [],
        weeklySchedule: e.weekly_schedule || []
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const { name, address, phone, lat, lng, serviceIds, image } = req.body;

      const { data: existing, error: errExist } = await supabaseAdmin
        .from('sucursales')
        .select('id')
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .single();

      if (errExist || !existing) return res.status(404).json({ error: 'Sucursal no encontrada' });

      const payload: any = {};
      if (name) payload.nombre = name;
      if (address) payload.direccion = address;
      if (phone !== undefined) payload.telefono = phone;
      if (lat !== undefined) payload.latitude = lat;
      if (lng !== undefined) payload.longitude = lng;
      if (serviceIds !== undefined) payload.service_ids = serviceIds;
      if (image !== undefined) payload.image_url = image;

      const { data, error } = await supabaseAdmin
        .from('sucursales')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({
        ...data,
        name: data.nombre,
        address: data.direccion,
        lat: data.latitude,
        lng: data.longitude,
        phone: data.telefono,
        serviceIds: data.service_ids || [],
        image: data.image_url || ''
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from('sucursales')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};