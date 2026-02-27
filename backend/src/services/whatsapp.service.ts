import { supabaseAdmin } from '../config/supabase.js';

const VERSION = 'v18.0';
const WINDOW_HOURS = 24; // WhatsApp Business conversation window

/**
 * Helper: Get tenant WA credentials from DB or fallback to env
 */
async function getCredentials(empresaId: string) {
    const { data: config } = await supabaseAdmin
        .from('configuraciones')
        .select('wa_phone_number_id, wa_access_token, wa_template_name')
        .eq('empresa_id', empresaId)
        .single();

    return {
        phoneNumberId: config?.wa_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: config?.wa_access_token || process.env.WHATSAPP_ACCESS_TOKEN,
        templateName: config?.wa_template_name || 'recordatorio_cita',
    };
}

export const whatsappService = {

    /**
     * Verifica si la ventana de conversación de 24h está abierta para un teléfono.
     * La ventana se abre cuando el CLIENTE envía un mensaje entrante.
     * Devuelve true si el último mensaje ENTRANTE del cliente fue hace menos de 24h.
     */
    async isWindowOpen(phone: string, empresaId: string): Promise<boolean> {
        const cleanPhone = phone.replace(/\D/g, '');

        const { data: lastIncoming } = await supabaseAdmin
            .from('mensajes')
            .select('created_at')
            .eq('empresa_id', empresaId)
            .eq('tipo', 'ENTRANTE')
            .eq('via', 'WHATSAPP')
            .ilike('telefono_remitente', `%${cleanPhone}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!lastIncoming) return false;

        const lastMsgTime = new Date(lastIncoming.created_at).getTime();
        const now = Date.now();
        const hoursDiff = (now - lastMsgTime) / (1000 * 60 * 60);

        const isOpen = hoursDiff < WINDOW_HOURS;
        console.log(`🪟 Ventana WA para ${cleanPhone}: ${isOpen ? '✅ ABIERTA' : '🔒 CERRADA'} (${hoursDiff.toFixed(1)}h desde último mensaje)`);

        return isOpen;
    },

    /**
     * Envía un mensaje de texto directo (solo si la ventana de 24h está abierta)
     */
    async sendMessage(to: string, text: string, empresaId: string, clienteId?: string) {
        const { phoneNumberId, accessToken } = await getCredentials(empresaId);

        if (!phoneNumberId || !accessToken) {
            console.error('❌ WhatsApp credentials missing for empresa:', empresaId);
            return { success: false, error: 'Credenciales de WhatsApp no configuradas.' };
        }

        const cleanTo = to.replace(/\D/g, '');

        try {
            console.log(`📤 Enviando mensaje WA directo a ${cleanTo}: "${text.slice(0, 50)}..."`);

            const response = await fetch(`https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanTo,
                    type: 'text',
                    text: { body: text },
                }),
            });

            const data: any = await response.json();
            console.log(`📡 Meta API Response (HTTP ${response.status}):`, JSON.stringify(data).slice(0, 500));

            if (data.messages && data.messages.length > 0) {
                const waId = data.messages[0].id;
                console.log(`✅ Mensaje WA enviado. WA_ID: ${waId}`);

                await supabaseAdmin.from('mensajes').insert([{
                    empresa_id: empresaId,
                    cliente_id: clienteId,
                    telefono_remitente: phoneNumberId,
                    telefono_destinatario: cleanTo,
                    contenido: text,
                    tipo: 'SALIENTE',
                    wa_id: waId,
                    estado: 'ENVIADO',
                    via: 'WHATSAPP'
                }]);

                return { success: true, waId };
            } else {
                console.error('❌ WhatsApp API Error:', JSON.stringify(data, null, 2));
                return { success: false, error: data.error?.message || 'Error desconocido de Meta' };
            }
        } catch (error: any) {
            console.error('❌ Fetch error sending WA:', error);
            return { success: false, error: error.message || 'Error de conexión con WhatsApp' };
        }
    },

    /**
     * Envía un template de WhatsApp (se puede enviar SIN ventana abierta)
     */
    async sendTemplate(to: string, templateName: string, languageCode: string, components: any[], empresaId: string, clienteId?: string) {
        const { phoneNumberId, accessToken } = await getCredentials(empresaId);

        if (!phoneNumberId || !accessToken) return { success: false, error: 'Credentials missing' };

        const cleanTo = to.replace(/\D/g, '');

        try {
            console.log(`📤 Enviando template WA "${templateName}" a ${cleanTo}`);

            const response = await fetch(`https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanTo,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components
                    },
                }),
            });

            const data: any = await response.json();
            console.log(`📡 Meta Template Response (HTTP ${response.status}):`, JSON.stringify(data).slice(0, 500));

            if (data.messages) {
                await supabaseAdmin.from('mensajes').insert([{
                    empresa_id: empresaId,
                    cliente_id: clienteId,
                    telefono_remitente: phoneNumberId,
                    telefono_destinatario: cleanTo,
                    contenido: `📋 Template: ${templateName}`,
                    tipo: 'SALIENTE',
                    wa_id: data.messages[0].id,
                    estado: 'ENVIADO',
                    via: 'WHATSAPP'
                }]);
                return { success: true };
            }
            console.error('❌ WA Template Error:', JSON.stringify(data, null, 2));
            return { success: false, error: data.error?.message || 'Error al enviar plantilla' };
        } catch (error: any) {
            console.error('❌ Template fetch error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * SMART SEND: Decide automáticamente si enviar mensaje directo o template.
     * - Si la ventana de 24h está ABIERTA → envía texto directo
     * - Si la ventana está CERRADA → envía template
     * 
     * Retorna: { success, method: 'direct' | 'template' | 'blocked', waId?, error? }
     */
    async sendSmartMessage(
        to: string,
        text: string,
        empresaId: string,
        clienteId?: string,
        templateConfig?: {
            templateName?: string;
            languageCode?: string;
            components?: any[];
        }
    ): Promise<{ success: boolean; method: 'direct' | 'template' | 'blocked'; waId?: string; error?: string }> {
        const windowOpen = await this.isWindowOpen(to, empresaId);

        if (windowOpen) {
            // Ventana abierta → mensaje directo
            const result = await this.sendMessage(to, text, empresaId, clienteId);
            return { success: result.success, method: 'direct', waId: result.waId, error: result.error as string };
        }

        // Ventana cerrada → intentar template
        const { templateName } = await getCredentials(empresaId);
        const tplName = templateConfig?.templateName || templateName;

        if (!tplName) {
            console.log(`🔒 Ventana cerrada para ${to} y no hay template configurado. Mensaje bloqueado.`);
            return {
                success: false,
                method: 'blocked',
                error: 'La ventana de 24h está cerrada y no hay template configurado. El cliente debe escribir primero.'
            };
        }

        console.log(`🔒 Ventana cerrada para ${to}. Usando template "${tplName}"`);
        const result = await this.sendTemplate(
            to,
            tplName,
            templateConfig?.languageCode || 'es',
            templateConfig?.components || [],
            empresaId,
            clienteId
        );

        return { success: result.success, method: 'template', error: result.error as string };
    }
};
