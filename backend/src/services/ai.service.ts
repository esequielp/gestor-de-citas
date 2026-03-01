import OpenAI from 'openai';
import 'dotenv/config';
import { aiToolsDefinition, executeAiTool } from './ai.tools';

const AI_MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ServiceForAI {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
}

/** Configuración del chatbot personalizable por tenant */
interface ChatbotConfig {
    businessType: string;
    businessName: string;
    personality: string;
    customInstructions: string;
}

/** Contexto de media adjunta al mensaje */
interface MediaContext {
    mediaUrl?: string | null;
    mediaType?: string | null; // 'image', 'audio', 'video', 'document'
    mediaMimeType?: string | null;
}

/** Valores por defecto cuando el tenant no ha personalizado su chatbot */
const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
    businessType: 'Centro de belleza, spa y cuidado personal',
    businessName: '',
    personality: 'Eres amable, empático y profesional. Hablas en español y usas un tono cálido y cercano.',
    customInstructions: '',
};

export const aiService = {
    async improveDescription(description: string, serviceName: string, config?: Partial<ChatbotConfig>): Promise<string> {
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY no configurada');
            }

            const businessType = config?.businessType || DEFAULT_CHATBOT_CONFIG.businessType;

            const response = await openai.chat.completions.create({
                model: AI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `Eres un copywriter publicitario estilo Hormozi, Schwartz y Halbert. Tu objetivo es crear descripciones altamente efectivas y convertibles para un servicio con sistema de reservas en el sector de ${businessType}.`
                    },
                    {
                        role: 'user',
                        content: `Genera un copy publicitario para el siguiente servicio:\n\nServicio: "${serviceName}"\n\nContexto original: ${description || 'N/A'}\n\nUsa estrictamente esta estructura:\n1. Hook (gancho) + curiosidad.\n2. Beneficio principal.\n3. Emoción (cómo se sentirá el cliente).\n4. Credibilidad (por qué confiar en nosotros o en este servicio).\n5. CTA (Llamado a la acción: objetivo que el usuario agende ahora).\n\nREGLAS:\n- Tono profesional, cercano y persuasivo.\n- Frases cortas.\n- Lenguaje simple.\n- En español.\n- Incluye explícitamente las secciones (pueden ser sutiles pero deben estar): Primary Text, Headline, Descripción y CTA.\n- Usa formato HTML básico (como <b>, <i>, <br>, <ul>, <li>) para que se renderice bien o Markdown.\n- Ve directo al texto, no agregues introducciones tuyas.`
                    }
                ]
            });

            let improvedText = response.choices[0].message.content?.trim() || description;
            improvedText = improvedText.replace(/^```(html|md|markdown)?\n?/i, '').replace(/```$/i, '').trim();
            return improvedText;
        } catch (error) {
            console.error('Error improving description with AI:', error);
            throw error;
        }
    },

    /**
     * Recomienda inteligentemente un servicio basándose en la necesidad descrita
     * por el cliente. Usa el catálogo real de servicios del tenant como contexto,
     * y la personalidad/tipo de negocio configurados por el tenant.
     */
    async recommendService(
        userMessage: string,
        services: ServiceForAI[],
        config?: Partial<ChatbotConfig>
    ): Promise<{ serviceId: string | null; explanation: string }> {
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY no configurada');
            }

            if (services.length === 0) {
                return { serviceId: null, explanation: 'No hay servicios disponibles en este momento.' };
            }

            const cfg: ChatbotConfig = {
                ...DEFAULT_CHATBOT_CONFIG,
                ...config,
            };

            const catalogText = services.map((s, i) =>
                `${i + 1}. ID: "${s.id}" | Nombre: "${s.name}" | Descripción: "${s.description || 'Sin descripción'}" | Precio: $${s.price} | Duración: ${s.duration} min`
            ).join('\n');

            const businessIdentity = cfg.businessName
                ? `Eres el asistente virtual de "${cfg.businessName}", un negocio de tipo: ${cfg.businessType}.`
                : `Eres un asistente virtual experto de un negocio de tipo: ${cfg.businessType}.`;

            const extraInstructions = cfg.customInstructions
                ? `\n\nINSTRUCCIONES ADICIONALES DEL NEGOCIO:\n${cfg.customInstructions}`
                : '';

            const response = await openai.chat.completions.create({
                model: AI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `${businessIdentity}
${cfg.personality}

Tu trabajo es escuchar la necesidad del cliente y recomendar el servicio más adecuado del catálogo disponible.

CATÁLOGO DE SERVICIOS DISPONIBLES:
${catalogText}

INSTRUCCIONES:
1. Analiza lo que el cliente necesita o describe (síntomas, deseos, necesidades, etc.).
2. Compara con los servicios disponibles y elige el MÁS adecuado.
3. Si el cliente describe algo para lo que hay un servicio claramente alineado, recomiéndalo.
4. Si el cliente describe algo ambiguo, elige el más probable y explica por qué.
5. Si NINGÚN servicio del catálogo se relaciona o si el usuario simplemente pregunta qué servicios tienen, responde con serviceId: null.
6. MUY IMPORTANTE: Si devuelves serviceId: null porque el usuario pide ver los servicios o su consulta es muy general, en la "explanation" JAMÁS digas que no tienes información o que no puedes ayudar. Simplemente di algo como "¡Claro! Aquí tienes nuestro catálogo de servicios disponibles:" o "No encontré un servicio específico para eso, pero puedes revisar nuestro catálogo completo a continuación:".
${extraInstructions}

FORMATO DE RESPUESTA (JSON estricto):
{
  "serviceId": "id_del_servicio_recomendado o null",
  "explanation": "Explicación breve y empática de por qué recomiendas ese servicio, en español, máximo 2 oraciones"
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional ni backticks.`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ]
            });

            let content = response.choices[0].message.content?.trim() || '';

            if (!content) {
                console.log('AI response message:', JSON.stringify(response.choices[0].message));
            }

            if (content.startsWith('```')) {
                content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
            }

            if (!content) {
                return { serviceId: null, explanation: 'No pude procesar tu solicitud. ¿Podrías reformular?' };
            }

            try {
                const parsed = JSON.parse(content);
                return {
                    serviceId: parsed.serviceId || null,
                    explanation: parsed.explanation || ''
                };
            } catch (parseErr) {
                console.error('Error parsing AI recommendation response:', content);
                return { serviceId: null, explanation: content.length > 10 ? content : 'No pude determinar un servicio específico. ¿Podrías darme más detalles?' };
            }
        } catch (error) {
            console.error('Error recommending service with AI:', error);
            throw error;
        }
    },

    /**
     * Transcribe audio using OpenAI Whisper API.
     * Downloads the audio from the URL, sends to Whisper, returns text.
     */
    async transcribeAudio(audioUrl: string): Promise<string> {
        try {
            if (!process.env.OPENAI_API_KEY) return '';

            console.log('🎙️ Transcribing audio with Whisper...');

            // Download the audio file
            const audioResponse = await fetch(audioUrl);
            if (!audioResponse.ok) {
                console.error('❌ Failed to download audio for transcription:', audioResponse.status);
                return '';
            }

            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

            // Detect extension from URL
            const ext = audioUrl.match(/\.(\w+)(?:\?|$)/)?.[1] || 'ogg';

            // Create a File object for the Whisper API
            const audioFile = new File([audioBuffer], `audio.${ext}`, {
                type: ext === 'ogg' ? 'audio/ogg' : ext === 'mp3' ? 'audio/mpeg' : 'audio/webm'
            });

            const transcription = await openai.audio.transcriptions.create({
                model: 'whisper-1',
                file: audioFile,
                language: 'es',
            });

            console.log(`✅ Audio transcribed: "${transcription.text.slice(0, 100)}..."`);
            return transcription.text;
        } catch (error) {
            console.error('❌ Error transcribing audio:', error);
            return '';
        }
    },

    /**
     * Genera una respuesta de chat fluida basada en la personalidad y contexto.
     * Supports multimodal content: images (via GPT-4o-mini vision) and audio (via Whisper transcription).
     */
    async generateResponse(
        userMessage: string,
        history: { role: 'user' | 'assistant'; content: string }[],
        services: ServiceForAI[],
        config?: Partial<ChatbotConfig>,
        mediaContext?: MediaContext,
        envContext?: { tenantId: string; clientId: string; clientName: string }
    ): Promise<string> {
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY no configurada');
            }

            const cfg: ChatbotConfig = {
                ...DEFAULT_CHATBOT_CONFIG,
                ...config,
            };

            const catalogText = services.length > 0
                ? `\n\nESTE ES NUESTRO CATÁLOGO DE SERVICIOS:\n${services.map(s => `- ${s.name}: ${s.description || ''} ($${s.price})`).join('\n')}`
                : '';

            const businessIdentity = cfg.businessName
                ? `Eres el asistente virtual de "${cfg.businessName}", un negocio de tipo: ${cfg.businessType}.`
                : `Eres un asistente virtual experto de un negocio de tipo: ${cfg.businessType}.`;

            const extraInstructions = cfg.customInstructions
                ? `\n\nREGLAS DE NEGOCIO IMPORTANTES:\n${cfg.customInstructions}`
                : '';

            // Build the user content (text or multimodal)
            let userContent: any = userMessage;

            // Handle media context
            if (mediaContext?.mediaUrl && mediaContext.mediaType) {
                if (mediaContext.mediaType === 'image') {
                    // GPT-4o-mini supports vision: pass image as content block
                    console.log('🖼️ Sending image to AI for vision analysis...');
                    userContent = [
                        {
                            type: 'text',
                            text: userMessage === '📷 Imagen'
                                ? 'El cliente me envió esta imagen. Descríbela brevemente y responde de forma útil según el contexto del negocio.'
                                : userMessage
                        },
                        {
                            type: 'image_url',
                            image_url: { url: mediaContext.mediaUrl, detail: 'low' }
                        }
                    ];
                } else if (mediaContext.mediaType === 'audio') {
                    // Transcribe audio with Whisper, then pass text to GPT
                    const transcription = await this.transcribeAudio(mediaContext.mediaUrl);
                    if (transcription) {
                        userContent = `[El cliente envió un mensaje de voz. Transcripción: "${transcription}"]`;
                        console.log('🎙️ Using audio transcription as AI input');
                    } else {
                        userContent = 'El cliente envió un audio que no pude transcribir. Responde amablemente preguntándole si puede repetir su mensaje o escribirlo.';
                    }
                } else if (mediaContext.mediaType === 'video') {
                    userContent = 'El cliente envió un video. Responde amablemente indicando que recibiste el video y preguntando en qué puedes ayudarle.';
                } else if (mediaContext.mediaType === 'document') {
                    userContent = `El cliente envió un documento (${userMessage}). Responde amablemente confirmando que lo recibiste y preguntando si necesita algo más.`;
                }
            }

            const messages: any[] = [
                {
                    role: 'system',
                    content: `${businessIdentity}
${cfg.personality}

TU OBJETIVO: Ayudar al cliente de forma amable y eficiente. Puedes responder preguntas generales, saludar, despedirte o dar información sobre los servicios.

${catalogText}
${extraInstructions}

REGLAS DE RESPUESTA Y COMPORTAMIENTO:
1. Mantén la personalidad asignada en todo momento, siendo natural y empático. No suenes robótico.
2. Si el cliente te saluda, salúdalo con calidez y naturalidad.
3. El cliente NO está interactuando con botones, sino escribiendo en chat libre. Interpreta sus respuestas (como "si", "dale", "me parece") de acuerdo al contexto de la conversación. No esperes respuestas exactas del catálogo.
4. Para resaltar texto en negrita, usa un solo asterisco al principio y al final (ejemplo: *texto en negrita*), NO uses doble asterisco.
5. FORMATO DE FECHAS: Cuando hables o escribas fechas al cliente, usa el formato dd/mm/YYYY o nombre del día (ejemplo: 27/02/2026, o "el próximo martes"). PERO al usar HERRAMIENTAS (tools) de disponibilidad o agenda, OBLIGATORIAMENTE debes usar el formato YYYY-MM-DD como lo piden las funciones.
6. Sé preactivo con el agendamiento: Si el usuario muestra intención de agendar o ver horas para un servicio, usa INMEDIATAMENTE la herramienta "consultar_disponibilidad" para buscar opciones, sin forzarlo a elegir con frases redundantes. Recomiéndale un servicio y consúltalo de inmediato.
7. Si el cliente envía una imagen, analízala y responde según lo que ves.
8. Si el cliente envía un audio, ya fue transcrito para ti. Responde al contenido de la transcripción de forma natural, sin mencionar que fue un audio transcrito.`
                },
                ...history.slice(-6),
                { role: 'user', content: userContent }
            ];

            let response = await openai.chat.completions.create({
                model: AI_MODEL,
                messages,
                tools: envContext ? (aiToolsDefinition as any) : undefined,
                tool_choice: envContext ? "auto" : "none",
            });

            const responseMessage = response.choices[0].message;

            if (responseMessage.tool_calls && envContext) {
                console.log("🛠️ AI decided to call tools:", responseMessage.tool_calls.map(t => t.function.name));
                messages.push(responseMessage); // append assistant's tool call request

                for (const toolCall of responseMessage.tool_calls) {
                    const toolResult = await executeAiTool(toolCall, {
                        tenantId: envContext.tenantId,
                        clientId: envContext.clientId,
                        clientName: envContext.clientName,
                        services: services
                    });

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolCall.function.name,
                        content: toolResult,
                    } as any);
                }

                response = await openai.chat.completions.create({
                    model: AI_MODEL,
                    messages
                });
            }

            return response.choices[0].message.content?.trim() || 'Lo siento, tuve un problema al procesar tu mensaje.';

        } catch (error) {
            console.error('Error in generateResponse:', error);
            throw error;
        }
    }
};
