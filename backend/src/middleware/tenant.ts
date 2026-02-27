import { Request, Response, NextFunction } from 'express';

import { supabaseAdmin } from '../config/supabase.js';

// Middleware to extract and resolve the tenant ID
export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
    let tenantInput =
        req.headers['x-tenant-id'] ||
        req.headers['x-tenant'] ||
        req.query.tenant ||
        req.query.tenantId ||
        req.body?.empresa_id;

    if (!tenantInput) {
        return res.status(401).json({ error: 'Identificador de empresa (tenant) es obligatorio' });
    }

    // Security: Sanitize tenantInput to prevent PostgREST filter injection
    if (typeof tenantInput === 'string') {
        tenantInput = tenantInput.trim().slice(0, 100); // Max 100 chars
        if (/[;'"()\\{}]/.test(tenantInput)) {
            return res.status(400).json({ error: 'Identificador de empresa contiene caracteres no válidos' });
        }
    } else {
        return res.status(400).json({ error: 'Identificador de empresa inválido' });
    }

    // Check if it's already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof tenantInput === 'string' && uuidRegex.test(tenantInput)) {
        (req as any).tenantId = tenantInput;
        return next();
    }

    // If not a UUID, try to find by slug or name
    try {
        console.log(`🔍 Buscando empresa por: ${tenantInput}`);

        // Try exact match first on name, then fuzzy
        const { data, error } = await supabaseAdmin
            .from('empresas')
            .select('id, nombre')
            .or(`nombre.eq.${tenantInput},nombre.ilike.%${tenantInput}%,email.ilike.%${tenantInput}%`)
            .limit(1)
            .single();

        if (error || !data) {
            console.error(`❌ No se encontró empresa para: ${tenantInput}`, error?.message);
            return res.status(404).json({ error: `No se encontró la empresa con el identificador: ${tenantInput}` });
        }

        console.log(`✅ Tenant resuelto: ${data.nombre} (${data.id})`);
        (req as any).tenantId = data.id;
        next();
    } catch (err) {
        console.error('🔥 Error fatal en requireTenant:', err);
        res.status(500).json({ error: 'Error al validar la empresa' });
    }
};

export const getTenantId = (req: Request): string => {
    return (req as any).tenantId as string;
};
