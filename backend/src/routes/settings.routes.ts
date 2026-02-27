import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

router.get('/reminders', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: config, error } = await supabaseAdmin
        .from('configuraciones')
        .select('*')
        .eq('empresa_id', tenantId)
        .single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    res.json({
        emailReminders: config?.emailReminders || "24",
        whatsappReminders: config?.whatsappReminders || "24",
        branding_logo_url: config?.branding_logo_url || "",
        branding_color_primario: config?.branding_color_primario || ""
    });
});

router.put('/reminders', async (req, res) => {
    const tenantId = getTenantId(req);
    const {
        emailReminders,
        whatsappReminders,
        branding_logo_url,
        branding_color_primario
    } = req.body;

    const { data: existing } = await supabaseAdmin
        .from('configuraciones')
        .select('id')
        .eq('empresa_id', tenantId)
        .single();

    let result, error;

    const payload = {
        recordatorios_email: !!emailReminders,
        recordatorios_whatsapp: !!whatsappReminders,
        dias_anticipacion_recordatorio: 1,
        branding_logo_url,
        branding_color_primario
    };

    if (existing) {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single());
    } else {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .insert([{ empresa_id: tenantId, ...payload }])
            .select()
            .single());
    }

    if (error) return res.status(500).json({ error: error.message });
    res.json(result);
});

// --- WhatsApp Business API Configuration per Tenant ---

router.get('/whatsapp', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: config, error } = await supabaseAdmin
        .from('configuraciones')
        .select('wa_phone_number_id, wa_business_account_id, wa_access_token, wa_verify_token, wa_template_name')
        .eq('empresa_id', tenantId)
        .single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    res.json({
        phoneNumberId: config?.wa_phone_number_id || '',
        businessAccountId: config?.wa_business_account_id || '',
        accessToken: config?.wa_access_token ? '••••••••' + (config.wa_access_token as string).slice(-8) : '',
        verifyToken: config?.wa_verify_token || '',
        templateName: config?.wa_template_name || 'recordatorio_cita',
        isConfigured: !!(config?.wa_phone_number_id && config?.wa_access_token),
    });
});

router.put('/whatsapp', async (req, res) => {
    const tenantId = getTenantId(req);
    const {
        phoneNumberId,
        businessAccountId,
        accessToken,
        verifyToken,
        templateName,
    } = req.body;

    const payload: any = {};
    if (phoneNumberId !== undefined) payload.wa_phone_number_id = phoneNumberId;
    if (businessAccountId !== undefined) payload.wa_business_account_id = businessAccountId;
    if (accessToken !== undefined && !accessToken.includes('••••')) payload.wa_access_token = accessToken;
    if (verifyToken !== undefined) payload.wa_verify_token = verifyToken;
    if (templateName !== undefined) payload.wa_template_name = templateName;

    const { data: existing } = await supabaseAdmin
        .from('configuraciones')
        .select('id')
        .eq('empresa_id', tenantId)
        .single();

    let result, error;

    if (existing) {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single());
    } else {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .insert([{ empresa_id: tenantId, ...payload }])
            .select()
            .single());
    }

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// --- Chatbot AI Configuration per Tenant ---

router.get('/chatbot', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: config, error } = await supabaseAdmin
        .from('configuraciones')
        .select('chatbot_business_type, chatbot_business_name, chatbot_greeting, chatbot_personality, chatbot_custom_instructions, chatbot_enabled')
        .eq('empresa_id', tenantId)
        .single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    res.json({
        businessType: config?.chatbot_business_type || 'Centro de belleza, spa y cuidado personal',
        businessName: config?.chatbot_business_name || '',
        greeting: config?.chatbot_greeting || '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        personality: config?.chatbot_personality || 'Eres amable, empático y profesional. Hablas en español y usas un tono cálido y cercano.',
        customInstructions: config?.chatbot_custom_instructions || '',
        enabled: config?.chatbot_enabled ?? true,
    });
});

router.put('/chatbot', async (req, res) => {
    const tenantId = getTenantId(req);
    const {
        businessType,
        businessName,
        greeting,
        personality,
        customInstructions,
        enabled,
    } = req.body;

    const payload: any = {};
    if (businessType !== undefined) payload.chatbot_business_type = businessType;
    if (businessName !== undefined) payload.chatbot_business_name = businessName;
    if (greeting !== undefined) payload.chatbot_greeting = greeting;
    if (personality !== undefined) payload.chatbot_personality = personality;
    if (customInstructions !== undefined) payload.chatbot_custom_instructions = customInstructions;
    if (enabled !== undefined) payload.chatbot_enabled = enabled;

    const { data: existing } = await supabaseAdmin
        .from('configuraciones')
        .select('id')
        .eq('empresa_id', tenantId)
        .single();

    let result, error;

    if (existing) {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single());
    } else {
        ({ data: result, error } = await supabaseAdmin
            .from('configuraciones')
            .insert([{ empresa_id: tenantId, ...payload }])
            .select()
            .single());
    }

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        businessType: result.chatbot_business_type,
        businessName: result.chatbot_business_name,
        greeting: result.chatbot_greeting,
        personality: result.chatbot_personality,
        customInstructions: result.chatbot_custom_instructions,
        enabled: result.chatbot_enabled,
    });
});

// --- Business Profile (Contact, About Us, Social Media) ---

router.get('/profile', async (req, res) => {
    const tenantId = getTenantId(req);
    const { data: empresa, error } = await supabaseAdmin
        .from('empresas')
        .select('nombre, email, telefono, descripcion, direccion, website, logo_url, slogan, instagram, facebook, tiktok, twitter, youtube, whatsapp_display, horario_atencion')
        .eq('id', tenantId)
        .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
        name: empresa?.nombre || '',
        email: empresa?.email || '',
        phone: empresa?.telefono || '',
        description: empresa?.descripcion || '',
        address: empresa?.direccion || '',
        website: empresa?.website || '',
        logoUrl: empresa?.logo_url || '',
        slogan: empresa?.slogan || '',
        instagram: empresa?.instagram || '',
        facebook: empresa?.facebook || '',
        tiktok: empresa?.tiktok || '',
        twitter: empresa?.twitter || '',
        youtube: empresa?.youtube || '',
        whatsappDisplay: empresa?.whatsapp_display || '',
        businessHours: empresa?.horario_atencion || '',
    });
});

router.put('/profile', async (req, res) => {
    const tenantId = getTenantId(req);
    const {
        name, email, phone, description, address, website,
        logoUrl, slogan, instagram, facebook, tiktok,
        twitter, youtube, whatsappDisplay, businessHours
    } = req.body;

    const payload: any = {};
    if (name !== undefined) payload.nombre = name;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.telefono = phone;
    if (description !== undefined) payload.descripcion = description;
    if (address !== undefined) payload.direccion = address;
    if (website !== undefined) payload.website = website;
    if (logoUrl !== undefined) payload.logo_url = logoUrl;
    if (slogan !== undefined) payload.slogan = slogan;
    if (instagram !== undefined) payload.instagram = instagram;
    if (facebook !== undefined) payload.facebook = facebook;
    if (tiktok !== undefined) payload.tiktok = tiktok;
    if (twitter !== undefined) payload.twitter = twitter;
    if (youtube !== undefined) payload.youtube = youtube;
    if (whatsappDisplay !== undefined) payload.whatsapp_display = whatsappDisplay;
    if (businessHours !== undefined) payload.horario_atencion = businessHours;

    const { data, error } = await supabaseAdmin
        .from('empresas')
        .update(payload)
        .eq('id', tenantId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;
