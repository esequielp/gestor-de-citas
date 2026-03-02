import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
    return {
        create: vi.fn(),
        transcription: vi.fn()
    };
});

vi.mock('openai', () => {
    return {
        default: class {
            chat = { completions: { create: mocks.create } };
            audio = { transcriptions: { create: mocks.transcription } };
        }
    };
});

import { aiService } from './ai.service';

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.OPENAI_API_KEY = 'test-key';
    });

    it('should improve description using gpt-4o-mini', async () => {
        mocks.create.mockResolvedValueOnce({
            choices: [{ message: { content: 'Descripción mejorada.' } }]
        });

        const result = await aiService.improveDescription('corte', 'Corte de Cabello');

        expect(result).toBe('Descripción mejorada.');
        expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gpt-4o-mini'
        }));
    });

    it('should recommend a service returning valid JSON', async () => {
        const mockResponse = JSON.stringify({ serviceId: '1', explanation: 'Te recomiendo Barba.' });
        mocks.create.mockResolvedValueOnce({
            choices: [{ message: { content: mockResponse } }]
        });

        const services = [{ id: '1', name: 'Barba', description: 'Arreglo de barba', price: 10, duration: 30 }];
        const result = await aiService.recommendService('Quiero arreglarme la barba', services);

        expect(result.serviceId).toBe('1');
        expect(result.explanation).toBe('Te recomiendo Barba.');
    });

    it('should handle invalid JSON from AI recommendation gracefully', async () => {
        mocks.create.mockResolvedValueOnce({
            choices: [{ message: { content: 'Oh claro, te ayudo con eso! no pude parsear JSON.' } }]
        });

        const services = [{ id: '1', name: 'Barba', description: 'Arreglo de barba', price: 10, duration: 30 }];
        const result = await aiService.recommendService('Algo ambiguo', services);

        expect(result.serviceId).toBeNull();
        expect(result.explanation).toContain('no pude parsear JSON');
    });

    it('should generate a response invoking AI tools and returning the second completion result', async () => {
        // Mock the first choice containing a tool call
        const mockToolCall = {
            id: 'call_123',
            type: 'function',
            function: { name: 'consultar_disponibilidad', arguments: '{}' }
        };

        const firstResponse = {
            choices: [{
                message: {
                    content: null,
                    tool_calls: [mockToolCall]
                }
            }]
        };

        const secondResponse = {
            choices: [{
                message: { content: 'Tengo este horario para ti: 10:00' }
            }]
        };

        // Enqueue responses
        mocks.create
            .mockResolvedValueOnce(firstResponse)
            .mockResolvedValueOnce(secondResponse);

        // We also mock the dependency of executeAiTool
        const aiToolsMock = await import('./ai.tools');
        vi.spyOn(aiToolsMock, 'executeAiTool').mockResolvedValueOnce(JSON.stringify({ slots: ['10:00'] }));

        const services = [{ id: '1', name: 'Barba', description: '', price: 10, duration: 30 }];
        const result = await aiService.generateResponse(
            'Quiero agendar',
            [],
            services,
            {},
            undefined,
            { tenantId: '1', clientId: '2', clientName: 'Juan' }
        );

        expect(aiToolsMock.executeAiTool).toHaveBeenCalledWith(mockToolCall, expect.objectContaining({
            tenantId: '1',
            clientId: '2'
        }));
        expect(result).toBe('Tengo este horario para ti: 10:00');
    });
});
