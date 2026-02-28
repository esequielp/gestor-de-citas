import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { aiService } from '../services/ai.service.js';
import { emailService } from '../services/email.service.js';
import { requireTenant, getTenantId } from '../middleware/tenant.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ffmpegStatic = require('ffmpeg-static') as string;
const ffmpeg = require('fluent-ffmpeg');
import os from 'os';
import path from 'path';
import fs from 'fs';

// Set ffmpeg binary path
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

const router = Router();

// Webhook Verification (Meta requirements)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('✅ WhatsApp Webhook Verified');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    res.sendStatus(400);
});

// Receiving Messages
router.post('/webhook', async (req, res) => {
    const body = req.body;

    if (!body) return res.sendStatus(400);

    // Handle Meta status updates (delivery receipts) — NOT messages
    if (body.statuses || body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        const statuses = body.statuses || body.entry?.[0]?.changes?.[0]?.value?.statuses;
        if (statuses?.[0]) {
            console.log(`📋 Estado WA: ${statuses[0].status} para ${statuses[0].recipient_id} (${statuses[0].id})`);
        }
        return res.sendStatus(200); // Acknowledge the status update
    }

    let message: any = null;
    let from = '';
    let msgBody = '';
    let waId = '';

    // Format 1: Standard Meta Webhook (nested structure)
    if (body.object === 'whatsapp_business_account' &&
        body.entry &&
        body.entry[0]?.changes &&
        body.entry[0].changes[0]?.value?.messages &&
        body.entry[0].changes[0].value.messages[0]
    ) {
        message = body.entry[0].changes[0].value.messages[0];
    }
    // Format 2: Alsheep AI / Chatwoot Flattened Format
    else if (body.messaging_product === 'whatsapp' && body.messages && body.messages[0]) {
        message = body.messages[0];
    } else {
        // Unknown format — log it for debugging
        console.log('⚠️ Webhook payload no reconocido:', JSON.stringify(body).slice(0, 300));
        return res.sendStatus(200); // Don't return 404, just acknowledge
    }

    from = message.from; // Sender phone
    waId = message.id;

    // Detect message type and extract content + media info
    let mediaId = '';
    let mediaMimeType = '';
    let mediaType = ''; // image, audio, video, document
    let mediaCaption = '';

    if (message.type === 'text') {
        msgBody = message.text.body;
    } else if (message.type === 'image' && message.image) {
        mediaId = message.image.id;
        mediaMimeType = message.image.mime_type || 'image/jpeg';
        mediaType = 'image';
        mediaCaption = message.image.caption || '';
        msgBody = mediaCaption || '📷 Imagen';
    } else if (message.type === 'audio' && message.audio) {
        mediaId = message.audio.id;
        mediaMimeType = message.audio.mime_type || 'audio/ogg';
        mediaType = 'audio';
        msgBody = '🎵 Audio';
    } else if (message.type === 'video' && message.video) {
        mediaId = message.video.id;
        mediaMimeType = message.video.mime_type || 'video/mp4';
        mediaType = 'video';
        mediaCaption = message.video.caption || '';
        msgBody = mediaCaption || '🎬 Video';
    } else if (message.type === 'document' && message.document) {
        mediaId = message.document.id;
        mediaMimeType = message.document.mime_type || 'application/octet-stream';
        mediaType = 'document';
        mediaCaption = message.document.caption || '';
        msgBody = mediaCaption || `📄 ${message.document.filename || 'Documento'}`;
    } else if (message.type === 'sticker' && message.sticker) {
        mediaId = message.sticker.id;
        mediaMimeType = message.sticker.mime_type || 'image/webp';
        mediaType = 'image';
        msgBody = '🏷️ Sticker';
    } else {
        // Location, contacts, interactive, etc.
        msgBody = message.text?.body || `[${message.type || 'unknown'}]`;
    }

    // Resolve recipient phone ID (to route to correct tenant)
    let recipientId = '';
    if (body.metadata?.phone_number_id) {
        recipientId = body.metadata.phone_number_id; // Alsheep Format
    } else if (body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
        recipientId = body.entry[0].changes[0].value.metadata.phone_number_id; // Standard Format
    }

    // Extract sender name if available
    let senderName = 'Nuevo Cliente (WA)';
    if (body.contacts?.[0]?.profile?.name) {
        senderName = body.contacts[0].profile.name;
    } else if (body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name) {
        senderName = body.entry[0].changes[0].value.contacts[0].profile.name;
    }

    console.log(`📩 Nuevo mensaje de ${senderName} (${from}) para ${recipientId}: ${msgBody}${mediaType ? ` [${mediaType}]` : ''}`);

    // 1. Try to find the client to get the tenant
    let { data: client } = await supabaseAdmin
        .from('clientes')
        .select('id, empresa_id')
        .ilike('telefono', `%${from}%`)
        .limit(1)
        .single();

    let empresaId = client?.empresa_id;

    // 2. If client not found, find the tenant by phone_number_id (multitenant routing)
    if (!empresaId && recipientId) {
        const { data: config } = await supabaseAdmin
            .from('configuraciones')
            .select('empresa_id')
            .eq('wa_phone_number_id', recipientId)
            .limit(1)
            .single();

        if (config) {
            empresaId = config.empresa_id;
            // Auto-create client with WA Name
            const { data: newClient } = await supabaseAdmin.from('clientes').insert([{
                empresa_id: empresaId,
                nombre: senderName,
                telefono: from
            }]).select().single();
            client = newClient;
        }
    }

    // 3. Fallback to default tenant (maintenance/demo)
    if (!empresaId) {
        const { data: firstEmpresa } = await supabaseAdmin.from('empresas').select('id').limit(1).single();
        empresaId = firstEmpresa?.id;
    }

    if (empresaId) {
        // 2. Save incoming message immediately (without media_url to not block webhook)
        const { data: savedMsg } = await supabaseAdmin.from('mensajes').insert([{
            empresa_id: empresaId,
            cliente_id: client?.id,
            telefono_remitente: from,
            telefono_destinatario: recipientId || process.env.WHATSAPP_PHONE_NUMBER_ID,
            contenido: msgBody,
            tipo: 'ENTRANTE',
            wa_id: waId,
            estado: 'RECIBIDO',
            via: 'WHATSAPP',
            media_url: null,
            media_type: mediaType || null,
            media_mime_type: mediaMimeType || null
        }]).select('id').single();

        // 3. Async block: Download media (if any) then trigger AI Auto-reply
        // Both run together so the AI can receive the media context (image/audio transcription)
        (async () => {
            let mediaUrl: string | null = null;

            // Step A: Download media if present
            if (mediaId && empresaId) {
                try {
                    const downloadResult = await whatsappService.downloadMedia(mediaId, empresaId!, mediaMimeType);
                    if (downloadResult.url) {
                        mediaUrl = downloadResult.url;
                        // Update the message row with the media URL
                        if (savedMsg?.id) {
                            await supabaseAdmin.from('mensajes')
                                .update({ media_url: downloadResult.url })
                                .eq('id', savedMsg.id);
                            console.log(`✅ Media URL updated for message ${savedMsg.id}`);
                        }
                    } else {
                        console.error(`⚠️ Media download failed for ${mediaId}: ${downloadResult.error}`);
                    }
                } catch (err) {
                    console.error('❌ Async media download error:', err);
                }
            }

            // Step B: AI Auto-reply (with media context if available)
            try {
                const { data: config } = await supabaseAdmin
                    .from('configuraciones')
                    .select('*')
                    .eq('empresa_id', empresaId)
                    .single();

                if (config?.chatbot_enabled && !client?.ai_disabled) {
                    // Get history (last 5-6 messages)
                    const { data: historyData } = await supabaseAdmin
                        .from('mensajes')
                        .select('tipo, contenido')
                        .eq('empresa_id', empresaId)
                        .or(`telefono_remitente.eq.${from},telefono_destinatario.eq.${from}`)
                        .order('created_at', { ascending: false })
                        .limit(6);

                    const history = (historyData || [])
                        .reverse()
                        .map((m: any) => ({
                            role: m.tipo === 'ENTRANTE' ? ('user' as const) : ('assistant' as const),
                            content: m.contenido
                        }));

                    // Get services for context
                    const { data: services } = await supabaseAdmin
                        .from('servicios')
                        .select('id, nombre, descripcion, precio, duracion_minutos')
                        .eq('empresa_id', empresaId)
                        .eq('is_active', true);

                    // Build media context for AI (image vision / audio transcription)
                    const mediaCtx = (mediaType && mediaUrl) ? {
                        mediaUrl,
                        mediaType,
                        mediaMimeType
                    } : undefined;

                    const aiResponse = await aiService.generateResponse(
                        msgBody,
                        history,
                        (services || []).map(s => ({
                            id: s.id,
                            name: s.nombre,
                            description: s.descripcion,
                            price: s.precio,
                            duration: s.duracion_minutos
                        })),
                        {
                            businessType: config.chatbot_business_type,
                            businessName: config.chatbot_business_name,
                            personality: config.chatbot_personality,
                            customInstructions: config.chatbot_custom_instructions
                        },
                        mediaCtx,
                        (empresaId && client) ? {
                            tenantId: empresaId,
                            clientId: client.id,
                            clientName: client.nombre || 'Cliente'
                        } : undefined
                    );

                    // Send via WhatsApp
                    await whatsappService.sendMessage(from, aiResponse, empresaId!, client?.id);
                }
            } catch (aiErr) {
                console.error('❌ Error in AI WhatsApp auto-reply:', aiErr);
            }
        })();

    }
    res.sendStatus(200);
});


// API for the frontend to list messages
router.get('/messages/:identifier', requireTenant, async (req, res) => {
    const { identifier } = req.params;
    const tenantId = getTenantId(req);

    // Check if identifier is a UUID (clientId) or a phone number/email/webId
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier as string);

    try {
        let messages: any[] = [];

        if (isUUID) {
            const { data, error } = await supabaseAdmin
                .from('mensajes')
                .select('*')
                .eq('empresa_id', tenantId)
                .eq('cliente_id', identifier)
                .order('created_at', { ascending: true });
            if (error) throw error;
            messages = data || [];
        } else {
            // For non-UUID identifiers (phones, emails, web client IDs),
            // query each column separately and merge results to avoid .or() quoting issues
            const queries = [
                supabaseAdmin.from('mensajes').select('*').eq('empresa_id', tenantId).eq('telefono_remitente', identifier),
                supabaseAdmin.from('mensajes').select('*').eq('empresa_id', tenantId).eq('telefono_destinatario', identifier),
                supabaseAdmin.from('mensajes').select('*').eq('empresa_id', tenantId).eq('email_remitente', identifier),
            ];
            const results = await Promise.all(queries);

            // Merge and deduplicate by id
            const seen = new Set<string>();
            for (const result of results) {
                if (result.error) throw result.error;
                for (const msg of (result.data || [])) {
                    if (!seen.has(msg.id)) {
                        seen.add(msg.id);
                        messages.push(msg);
                    }
                }
            }
            // Sort by created_at ascending
            messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        res.json(messages);
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark messages as read
router.post('/read/:identifier', requireTenant, async (req, res) => {
    const { identifier } = req.params;
    const tenantId = getTenantId(req);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    try {
        const baseFilter = { empresa_id: tenantId, estado: 'RECIBIDO', tipo: 'ENTRANTE' };

        if (isUUID) {
            await supabaseAdmin.from('mensajes').update({ estado: 'LEIDO' })
                .eq('empresa_id', tenantId).eq('estado', 'RECIBIDO').eq('tipo', 'ENTRANTE')
                .eq('cliente_id', identifier);
        } else {
            // Mark by telefono_remitente
            await supabaseAdmin.from('mensajes').update({ estado: 'LEIDO' })
                .eq('empresa_id', tenantId).eq('estado', 'RECIBIDO').eq('tipo', 'ENTRANTE')
                .eq('telefono_remitente', identifier);
            // Mark by email_remitente
            await supabaseAdmin.from('mensajes').update({ estado: 'LEIDO' })
                .eq('empresa_id', tenantId).eq('estado', 'RECIBIDO').eq('tipo', 'ENTRANTE')
                .eq('email_remitente', identifier);
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// API for the backend inbox - Returns unique chats with the latest message
router.get('/chats', requireTenant, async (req, res) => {
    try {
        const tenantId = getTenantId(req);

        // This query gets the latest message for each unique combination of client or sender identifier
        // We use a creative approach with post-processing since simple GROUP BY in Supabase can be tricky without RPC
        const { data: messages, error } = await supabaseAdmin
            .from('mensajes')
            .select('*, cliente:clientes(nombre, telefono, email, ai_disabled)')
            .eq('empresa_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Grouping in JS to ensure unique chats and count unread
        const uniqueChats: any[] = [];
        const chatsMap = new Map();

        (messages || []).forEach(msg => {
            // Grouping identifier: clientId if exists, otherwise phone or email
            const identifier = msg.cliente_id || msg.telefono_remitente || msg.email_remitente;

            if (!chatsMap.has(identifier)) {
                const chat = {
                    id: identifier,
                    client_id: msg.cliente_id,
                    nombre: msg.cliente?.nombre || msg.nombre_remitente || msg.telefono_remitente || 'Usuario Web',
                    telefono: msg.cliente?.telefono || msg.telefono_remitente,
                    email: msg.cliente?.email || msg.email_remitente,
                    ult_msg_texto: msg.contenido || msg.texto,
                    ult_msg_fecha: msg.created_at,
                    via: msg.via,
                    unreadCount: 0,
                    ai_disabled: msg.cliente?.ai_disabled || false
                };
                chatsMap.set(identifier, chat);
                uniqueChats.push(chat);
            }

            // Count unread messages (received and not yet processed)
            if (msg.estado === 'RECIBIDO' && msg.tipo === 'ENTRANTE') {
                chatsMap.get(identifier).unreadCount += 1;
            }
        });

        res.json(uniqueChats);
    } catch (error: any) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unread message count for notification bubble
router.get('/unread-count', requireTenant, async (req, res) => {
    const tenantId = getTenantId(req);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h

    const { count, error } = await supabaseAdmin
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', tenantId)
        .eq('tipo', 'ENTRANTE')
        .gte('created_at', since);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ count: count || 0 });
});

router.post('/save-direct', async (req, res) => {
    try {
        let { empresaId, clienteId, clientId, nombre, email, phone, text, via, tipo } = req.body;
        const actualClientId = clienteId || clientId;

        // Input validation
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }
        if (text.length > 2000) {
            return res.status(400).json({ error: 'El mensaje es demasiado largo (máx. 2000 caracteres)' });
        }
        if (nombre && nombre.length > 100) nombre = nombre.slice(0, 100);

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!empresaId || !uuidRegex.test(empresaId)) {
            const { data: firstEmpresa } = await supabaseAdmin.from('empresas').select('id').limit(1).single();
            empresaId = firstEmpresa?.id;
        }
        if (!empresaId) {
            return res.status(400).json({ error: 'No se pudo determinar la empresa' });
        }

        const isClientUUID = actualClientId && uuidRegex.test(actualClientId);
        const isBot = tipo === 'SALIENTE';

        const { data, error } = await supabaseAdmin.from('mensajes').insert([{
            empresa_id: empresaId,
            cliente_id: isClientUUID ? actualClientId : null,
            nombre_remitente: isBot ? 'Asistente AgendaPro' : (nombre || 'Usuario Web'),
            email_remitente: isBot ? null : email,
            telefono_remitente: isBot ? 'APP' : (phone || email || actualClientId || 'WEB'),
            telefono_destinatario: isBot ? (actualClientId || 'WEB') : (via || 'APP'),
            contenido: text.trim(),
            tipo: tipo || 'ENTRANTE',
            via: via || 'WEB_CHAT',
            estado: isBot ? 'ENVIADO' : 'RECIBIDO'
        }]).select().single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// API to send a manual message from chat
router.post('/send', requireTenant, async (req, res) => {
    const { clientId, text, phone, via } = req.body;
    const tenantId = getTenantId(req);

    // If it's WhatsApp, use smart send (respects 24h window)
    if (!via || via === 'WHATSAPP') {
        const result = await whatsappService.sendSmartMessage(phone, text, tenantId, clientId);
        if (result.success) {
            return res.json({ success: true, waId: result.waId, method: result.method });
        } else {
            return res.status(result.method === 'blocked' ? 403 : 500).json({
                error: result.error,
                method: result.method,
                windowClosed: result.method === 'blocked'
            });
        }
    } else {
        // If it's Web Chat, just save it as outgoing
        const { data, error } = await supabaseAdmin.from('mensajes').insert([{
            empresa_id: tenantId,
            cliente_id: clientId,
            telefono_remitente: 'APP',
            telefono_destinatario: phone || 'WEB',
            contenido: text,
            tipo: 'SALIENTE',
            via: via,
            estado: 'ENVIADO'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    }
});

// API to toggle AI intervention for a client
router.post('/ai-toggle/:identifier', requireTenant, async (req, res) => {
    const { identifier } = req.params;
    const { disabled } = req.body;
    const tenantId = getTenantId(req);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabaseAdmin
        .from('clientes')
        .update({ ai_disabled: disabled })
        .eq('empresa_id', tenantId);

    if (isUUID) {
        query = query.eq('id', identifier);
    } else {
        query = query.eq('telefono', identifier);
    }

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, ai_disabled: disabled });
});
// API to reply to a WEB_CONTACT message via email
router.post('/reply-contact', requireTenant, async (req, res) => {
    const { email, clientName, originalMessage, replyMessage } = req.body;
    const tenantId = getTenantId(req);

    if (!email || !replyMessage) {
        return res.status(400).json({ error: 'Email y mensaje de respuesta son requeridos' });
    }

    try {
        // Get business name
        const { data: empresa } = await supabaseAdmin
            .from('empresas')
            .select('nombre')
            .eq('id', tenantId)
            .single();

        const companyName = empresa?.nombre || 'AgendaPro';

        // Send the email
        const emailResult = await emailService.sendContactReply({
            email,
            clientName: clientName || 'Cliente',
            originalMessage: originalMessage || '',
            replyMessage,
            companyName
        });

        if (!emailResult.success) {
            return res.status(500).json({ error: 'Error al enviar email', details: emailResult.error });
        }

        // Save the reply as a SALIENTE message in the DB
        const { data, error } = await supabaseAdmin.from('mensajes').insert([{
            empresa_id: tenantId,
            nombre_remitente: companyName,
            email_remitente: null,
            telefono_remitente: 'APP',
            telefono_destinatario: email,
            contenido: replyMessage,
            tipo: 'SALIENTE',
            via: 'WEB_CONTACT',
            estado: 'ENVIADO'
        }]).select().single();

        if (error) throw error;


        res.json({ success: true, emailId: emailResult.id, message: data });
    } catch (error: any) {
        console.error('Error replying to contact:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Helper: Convert webm audio buffer to ogg using ffmpeg.
 * Required because WhatsApp API only accepts ogg/opus, not webm.
 */
async function convertWebmToOgg(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const tmpInput = path.join(os.tmpdir(), `wa_input_${Date.now()}.webm`);
        const tmpOutput = path.join(os.tmpdir(), `wa_output_${Date.now()}.ogg`);

        fs.writeFileSync(tmpInput, inputBuffer);

        ffmpeg(tmpInput)
            .audioCodec('libopus')
            .format('ogg')
            .on('end', () => {
                try {
                    const outputBuffer = fs.readFileSync(tmpOutput);
                    // Cleanup temp files
                    fs.unlinkSync(tmpInput);
                    fs.unlinkSync(tmpOutput);
                    resolve(outputBuffer);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err: Error) => {
                // Cleanup temp files on error
                try { fs.unlinkSync(tmpInput); } catch (_) { }
                try { fs.unlinkSync(tmpOutput); } catch (_) { }
                reject(err);
            })
            .save(tmpOutput);
    });
}

// Upload media from admin (base64 encoded) to Supabase Storage
router.post('/upload-media', requireTenant, async (req, res) => {
    const { fileBase64, fileName, mimeType } = req.body;
    const tenantId = getTenantId(req);

    if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: 'fileBase64 and fileName are required' });
    }

    try {
        let buffer = Buffer.from(fileBase64, 'base64');
        let finalMimeType = mimeType || 'application/octet-stream';
        let finalFileName = fileName;

        // Convert webm audio to ogg (WhatsApp only accepts ogg/opus)
        if (mimeType && (mimeType.includes('webm') || mimeType.includes('audio/webm'))) {
            console.log('🔄 Converting webm audio to ogg/opus for WhatsApp compatibility...');
            try {
                buffer = await convertWebmToOgg(buffer);
                finalMimeType = 'audio/ogg; codecs=opus';
                finalFileName = fileName.replace(/\.webm$/, '.ogg');
                console.log('✅ Audio converted successfully to ogg/opus');
            } catch (convErr) {
                console.error('⚠️ Audio conversion failed, uploading as-is:', convErr);
            }
        }

        const storagePath = `${tenantId}/${Date.now()}_${finalFileName}`;

        const { data, error } = await supabaseAdmin.storage
            .from('chat_media')
            .upload(storagePath, buffer, {
                contentType: finalMimeType,
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = supabaseAdmin.storage
            .from('chat_media')
            .getPublicUrl(storagePath);

        res.json({ success: true, url: urlData?.publicUrl, path: storagePath });
    } catch (error: any) {
        console.error('Error uploading media:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send media (image/audio/document) to WhatsApp from admin
router.post('/send-media', requireTenant, async (req, res) => {
    const { phone, clientId, mediaUrl, mediaType, caption, fileName } = req.body;
    const tenantId = getTenantId(req);

    if (!phone || !mediaUrl || !mediaType) {
        return res.status(400).json({ error: 'phone, mediaUrl, and mediaType are required' });
    }

    try {
        let result;
        switch (mediaType) {
            case 'image':
                result = await whatsappService.sendImage(phone, mediaUrl, caption || '', tenantId, clientId);
                break;
            case 'audio':
                result = await whatsappService.sendAudio(phone, mediaUrl, tenantId, clientId);
                break;
            case 'video':
                result = await whatsappService.sendVideo(phone, mediaUrl, caption || '', tenantId, clientId);
                break;
            case 'document':
                result = await whatsappService.sendDocument(phone, mediaUrl, fileName || 'file', caption || '', tenantId, clientId);
                break;
            default:
                return res.status(400).json({ error: `Unsupported media type: ${mediaType}` });
        }

        if (result.success) {
            res.json({ success: true, waId: result.waId });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        console.error('Error sending media:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
