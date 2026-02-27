import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';
import { aiService } from '../services/ai.service.js';

const router = Router();

// Todas las rutas de servicios necesitan saber de qué empresa son:
router.use(requireTenant);

router.post('/ai/improve-description', async (req, res) => {
  try {
    const { description, serviceName } = req.body;
    const improved = await aiService.improveDescription(description || '', serviceName || '');
    res.json({ description: improved });
  } catch (error: any) {
  }
});

// AI-powered service recommendation based on user needs
router.post('/ai/recommend', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Se requiere un mensaje del usuario' });
    }

    // Fetch chatbot configuration for this tenant
    const { data: configData } = await supabaseAdmin
      .from('configuraciones')
      .select('chatbot_business_type, chatbot_business_name, chatbot_personality, chatbot_custom_instructions, chatbot_enabled')
      .eq('empresa_id', tenantId)
      .single();

    // Check if chatbot is enabled for this tenant
    if (configData && configData.chatbot_enabled === false) {
      return res.json({
        service: null,
        explanation: 'El asistente virtual no está habilitado para este negocio.',
      });
    }

    // Build tenant-specific chatbot config
    const chatbotConfig = {
      businessType: configData?.chatbot_business_type || undefined,
      businessName: configData?.chatbot_business_name || undefined,
      personality: configData?.chatbot_personality || undefined,
      customInstructions: configData?.chatbot_custom_instructions || undefined,
    };

    // Fetch all active services for this tenant
    const { data: services, error: dbError } = await supabaseAdmin
      .from('servicios')
      .select('*')
      .eq('empresa_id', tenantId)
      .eq('is_active', true);

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    // Map to the shape the AI service expects
    const servicesForAI = (services || []).map(s => ({
      id: s.id,
      name: s.nombre,
      description: s.descripcion || '',
      price: s.precio,
      duration: s.duracion_minutos,
    }));

    // Ask AI for recommendation with tenant-specific config
    const aiResult = await aiService.recommendService(message, servicesForAI, chatbotConfig);

    // If AI returned a serviceId, find the full service object
    let matchedService = null;
    if (aiResult.serviceId) {
      const found = (services || []).find(s => s.id === aiResult.serviceId);
      if (found) {
        matchedService = {
          id: found.id,
          name: found.nombre,
          description: found.descripcion,
          price: found.precio,
          duration: found.duracion_minutos,
          active: found.is_active,
          image: found.image_url || '',
          sesiones_totales: found.sesiones_totales || 1,
        };
      }
    }

    res.json({
      service: matchedService,
      explanation: aiResult.explanation,
    });
  } catch (error: any) {
    console.error('Error in AI recommendation:', error);
    res.status(500).json({
      service: null,
      explanation: 'Ocurrió un error al buscar la recomendación. ¿Podrías intentar de nuevo?',
    });
  }
});

// General AI Conversation (fallback during booking/general queries)
router.post('/ai/chat', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Se requiere un mensaje' });
    }

    // Get config
    const { data: configData } = await supabaseAdmin
      .from('configuraciones')
      .select('chatbot_business_type, chatbot_business_name, chatbot_personality, chatbot_custom_instructions, chatbot_enabled')
      .eq('empresa_id', tenantId)
      .single();

    if (configData && configData.chatbot_enabled === false) {
      return res.json({ reply: 'El asistente virtual no está habilitado.' });
    }

    const chatbotConfig = {
      businessType: configData?.chatbot_business_type || undefined,
      businessName: configData?.chatbot_business_name || undefined,
      personality: configData?.chatbot_personality || undefined,
      customInstructions: configData?.chatbot_custom_instructions || undefined,
    };

    // Get services
    const { data: services } = await supabaseAdmin
      .from('servicios')
      .select('*')
      .eq('empresa_id', tenantId)
      .eq('is_active', true);

    const servicesForAI = (services || []).map(s => ({
      id: s.id,
      name: s.nombre,
      description: s.descripcion || '',
      price: s.precio,
      duration: s.duracion_minutos,
    }));

    const history = [{ role: 'user' as const, content: message }];
    const reply = await aiService.generateResponse(message, history, servicesForAI, chatbotConfig);

    res.json({ reply });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ reply: 'Ocurrió un error. ¿Podrías intentar de nuevo?' });
  }
});


router.get('/', async (req, res) => {
  const tenantId = getTenantId(req);
  const { data: services, error } = await supabaseAdmin
    .from('servicios')
    .select('*')
    .eq('empresa_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Map to frontend expected shape
  res.json((services || []).map(s => ({
    ...s,
    name: s.nombre,
    description: s.descripcion,
    price: s.precio,
    duration: s.duracion_minutos,
    active: s.is_active,
    image: s.image_url || '',
    sesiones_totales: s.sesiones_totales || 1
  })));
});

router.get('/:id', async (req, res) => {
  const tenantId = getTenantId(req);
  const { data: s, error } = await supabaseAdmin
    .from('servicios')
    .select('*')
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId)
    .single();

  if (error || !s) return res.status(404).json({ error: 'Servicio no encontrado' });

  res.json({
    ...s,
    name: s.nombre,
    description: s.descripcion,
    price: s.precio,
    duration: s.duracion_minutos,
    active: s.is_active,
    image: s.image_url || '',
    sesiones_totales: s.sesiones_totales || 1
  });
});

router.post('/', async (req, res) => {
  const tenantId = getTenantId(req);
  const { nombre, description, duracion_minutos, precio, active, image_url, image } = req.body;

  const { data: service, error } = await supabaseAdmin
    .from('servicios')
    .insert([{
      empresa_id: tenantId,
      nombre: nombre || req.body.name, // Support both names initially
      descripcion: description || req.body.description,
      duracion_minutos: duracion_minutos || req.body.duration,
      precio: precio || req.body.price,
      is_active: active !== undefined ? active : true,
      image_url: image_url || image || '',
      sesiones_totales: req.body.sesiones_totales || 1
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({
    ...service,
    name: service.nombre,
    description: service.descripcion,
    price: service.price,
    duration: service.duracion_minutos,
    active: service.is_active,
    image: service.image_url || '',
    sesiones_totales: service.sesiones_totales
  });
});

router.put('/:id', async (req, res) => {
  const tenantId = getTenantId(req);
  const { nombre, description, duracion_minutos, precio, active, image_url, image } = req.body;

  // Verificar que el servicio existe y pertenece al tenant
  const { data: existing, error: errExist } = await supabaseAdmin
    .from('servicios')
    .select('id')
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId)
    .single();

  if (errExist || !existing) return res.status(404).json({ error: 'Servicio no encontrado o sin acceso' });

  const payload: any = {};
  const nameVal = nombre || req.body.name;
  const descVal = description || req.body.description;
  const durVal = duracion_minutos || req.body.duration;
  const priceVal = precio || req.body.price;
  const activeVal = active !== undefined ? active : req.body.active;
  const imgVal = image_url || image || req.body.image;

  if (nameVal !== undefined) payload.nombre = nameVal;
  if (descVal !== undefined) payload.descripcion = descVal;
  if (durVal !== undefined) payload.duracion_minutos = durVal;
  if (priceVal !== undefined) payload.precio = priceVal;
  if (activeVal !== undefined) payload.is_active = activeVal;
  if (imgVal !== undefined) payload.image_url = imgVal;
  if (req.body.sesiones_totales !== undefined) payload.sesiones_totales = req.body.sesiones_totales;

  console.log('Update payload:', payload);
  const { data: results, error } = await supabaseAdmin
    .from('servicios')
    .update(payload)
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId)
    .select();

  if (error) {
    console.error('Update error details:', error);
    return res.status(500).json({ error: error.message });
  }

  const service = results && results.length > 0 ? results[0] : null;
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado tras actualización' });

  res.json({
    ...service,
    name: service.nombre,
    description: service.descripcion,
    price: service.precio,
    duration: service.duracion_minutos,
    active: service.is_active,
    image: service.image_url || '',
    sesiones_totales: service.sesiones_totales
  });
});

router.delete('/:id', async (req, res) => {
  const tenantId = getTenantId(req);

  const { error } = await supabaseAdmin
    .from('servicios')
    .delete()
    .eq('id', req.params.id)
    .eq('empresa_id', tenantId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;