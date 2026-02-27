import OpenAI from 'openai';
import 'dotenv/config';

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

/** Valores por defecto cuando el tenant no ha personaliiado su chatbot */
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
                        content: `Eres un copywriter experto en el sector de ${businessType}. Tu misión es crear descripciones de servicios que vendan. Deben ser concisas (máximo 3-4 líneas), persuasivas, resaltar los beneficios clave y tener un tono premium y atractivo. Usa un par de emojis relacionados.`
                    },
                    {
                        role: 'user',
                        content: `Escribe una descripción comercial y muy atractiva para el servicio: "${serviceName}".\n\nDescripción o contexto original: ${description || 'N/A'}\n\nREGLAS:\n1. Ve directo al grano.\n2. No incluyas textos introductorios como "Esta es tu descripción".\n3. Máximo 4 oraciones.\n4. Si el contexto original está vacío, crea una descripción estándar excelente para el servicio nombrado.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200,
            });

            return response.choices[0].message.content?.trim() || description;
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

            // Merge con defaults
            const cfg: ChatbotConfig = {
                ...DEFAULT_CHATBOT_CONFIG,
                ...config,
            };

            // Construir el catálogo de servicios como contexto para la IA
            const catalogText = services.map((s, i) =>
                `${i + 1}. ID: "${s.id}" | Nombre: "${s.name}" | Descripción: "${s.description || 'Sin descripción'}" | Precio: $${s.price} | Duración: ${s.duration} min`
            ).join('\n');

            // Construir el nombre del negocio en el prompt si está configurado
            const businessIdentity = cfg.businessName
                ? `Eres el asistente virtual de "${cfg.businessName}", un negocio de tipo: ${cfg.businessType}.`
                : `Eres un asistente virtual experto de un negocio de tipo: ${cfg.businessType}.`;

            // Instrucciones adicionales del tenant
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
                ],
                temperature: 0.3,
                max_tokens: 200,
            });

            let content = response.choices[0].message.content?.trim() || '';

            // Log for debugging if content is empty
            if (!content) {
                console.log('AI response message:', JSON.stringify(response.choices[0].message));
            }

            // Strip markdown code fences if the model wraps JSON in ```json ... ```
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
     * Genera una respuesta de chat fluida basada en la personalidad y contexto
     */
    async generateResponse(
        userMessage: string,
        history: { role: 'user' | 'assistant'; content: string }[],
        services: ServiceForAI[],
        config?: Partial<ChatbotConfig>
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

            const messages: any[] = [
                {
                    role: 'system',
                    content: `${businessIdentity}
${cfg.personality}

TU OBJETIVO: Ayudar al cliente de forma amable y eficiente. Puedes responder preguntas generales, saludar, despedirte o dar información sobre los servicios.

${catalogText}
${extraInstructions}

REGLAS DE RESPUESTA:
1. Mantén la personalidad asignada en todo momento.
2. Si el cliente te saluda, salúdalo con calidez.
3. Si pregunta por algo que no está en el catálogo o instrucciones, di que por el momento no tienes esa información pero que un humano lo revisará pronto.
4. Intenta ser breve y directo.
5. NO inventes servicios que no están en la lista.
6. Habla siempre en español.
7. IMPORTANTE: Para resaltar texto en negrita, usa un solo asterisco al principio y al final (ejemplo: *texto en negrita*), NO uses doble asterisco.
8. IMPORTANTE: Siempre que menciones fechas, usa el formato dd/mm/YYYY (ejemplo: 27/02/2026). NUNCA uses el formato YYYY-MM-DD.`
                },
                ...history.slice(-6), // Tomamos los últimos 6 mensajes para contexto
                { role: 'user', content: userMessage }
            ];

            const response = await openai.chat.completions.create({
                model: AI_MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            });

            return response.choices[0].message.content?.trim() || 'Lo siento, tuve un problema al procesar tu mensaje.';
        } catch (error) {
            console.error('Error in generateResponse:', error);
            throw error;
        }
    }
};
