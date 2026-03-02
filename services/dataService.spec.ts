import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './apiClient';
import { dataService } from './dataService';

vi.mock('./apiClient', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            interceptors: {
                request: { use: vi.fn() },
            }
        }
    };
});

describe('DataService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getOrCreateClient', () => {
        it('should return existing client if emails match ignoring case', async () => {
            vi.mocked(apiClient.get).mockResolvedValueOnce({
                data: [{ id: '1', name: 'John', email: 'JOHN@EXAMPLE.COM', phone: '123' }]
            });

            const result = await dataService.getOrCreateClient('John', 'john@example.com', '123');
            expect(result.id).toBe('1');
            expect(apiClient.post).not.toHaveBeenCalled();
        });

        it('should gracefully handle clients with no email (null or undefined) in the database', async () => {
            // Mock db returning a client with null/missing email
            vi.mocked(apiClient.get).mockResolvedValueOnce({
                data: [
                    { id: '1', name: 'No Email User', email: null, phone: '555' },
                    { id: '2', name: 'John', email: 'other@example.com', phone: '123' }
                ]
            });

            // Mock the POST request since no match will be found
            vi.mocked(apiClient.post).mockResolvedValueOnce({
                data: { id: '3', name: 'New User', email: 'new@example.com', phone: '999' }
            });

            const result = await dataService.getOrCreateClient('New User', 'new@example.com', '999');

            expect(result.id).toBe('3');
            expect(apiClient.post).toHaveBeenCalledWith('/clients', expect.objectContaining({
                email: 'new@example.com'
            }));
        });
    });
});
