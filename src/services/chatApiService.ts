import { Service, Branch, Employee } from '../../types';
import { dataService } from '../../services/dataService';

// Small delay for a natural chat experience
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const chatApiService = {
    async getServices() {
        await delay(300);
        return await dataService.getServices();
    },

    async getBranches() {
        await delay(300);
        return await dataService.getBranches();
    },

    async getEmployees(branchId: string, serviceId?: string) {
        await delay(300);
        let employees = await dataService.getEmployeesByBranch(branchId);

        if (serviceId) {
            employees = employees.filter(e => e.serviceIds && e.serviceIds.includes(serviceId));
        }

        return employees;
    },

    async getEmployeesForTime(branchId: string, serviceId: string, date: string, timeStr: string) {
        let employees = await this.getEmployees(branchId, serviceId);
        try {
            const slots = await dataService.getAvailableSlots(branchId, serviceId, date);
            const slot = slots.find(s => s.timeString === timeStr);
            if (slot && slot.availableEmployeeIds) {
                employees = employees.filter(e => slot.availableEmployeeIds.includes(e.id));
            }
        } catch (e) {
            console.error("Error fetching available employees for slot:", e);
        }
        return employees;
    },

    async getAvailability(date: string, branchId?: string, serviceId?: string) {
        await delay(500);
        if (!branchId || !serviceId) {
            return [];
        }

        try {
            const slots = await dataService.getAvailableSlots(branchId, serviceId, date);
            return slots.map(s => s.timeString);
        } catch (e) {
            console.error("Error fetching available slots:", e);
            return [];
        }
    },

    async createAppointment(data: any) {
        await delay(1000);

        const clientName = data.clientName || '';
        const clientEmail = data.clientEmail || '';
        const clientPhone = data.clientPhone || '';

        let clientId = '';
        try {
            const client = await dataService.getOrCreateClient(clientName, clientEmail, clientPhone);
            clientId = client.id;
        } catch (e) {
            console.error("Error creating/getting client:", e);
            throw new Error("Cannot prepare client");
        }

        let timeMinutes = 540;
        if (data.time) {
            const [hh, mm] = data.time.split(':').map(Number);
            timeMinutes = (hh * 60) + mm;
        }

        let finalEmployeeId = data.professional?.id || 'any';

        try {
            const result = await dataService.addAppointment({
                branchId: data.branch.id,
                serviceId: data.service.id,
                employeeId: finalEmployeeId,
                clientId: clientId,
                date: data.date,
                time: timeMinutes,
                clientName: clientName
            });
            return result;
        } catch (e) {
            console.error("Error creating real appointment:", e);
            throw e;
        }
    },

    /**
     * Recomendación inteligente de servicios usando IA (OpenAI).
     * Envía la necesidad del cliente + catálogo de servicios al backend,
     * y la IA elige cuál(es) servicio(s) son los más adecuados.
     */
    async recommendService(text: string): Promise<{ service: Service | null; explanation: string }> {
        try {
            const result = await dataService.recommendServiceAI(text);
            return result;
        } catch (e) {
            console.error("Error en recomendación IA, intentando búsqueda local:", e);
            // Fallback: búsqueda por texto simple si la IA falla
            const services = await dataService.getServices();
            const lowerText = text.toLowerCase();
            const found = services.find(service =>
                service.name.toLowerCase().includes(lowerText) ||
                (service.description && service.description.toLowerCase().includes(lowerText))
            );
            return {
                service: found || null,
                explanation: found
                    ? `Te recomiendo nuestro servicio de ${found.name}.`
                    : ''
            };
        }
    },

    async chat(text: string): Promise<string> {
        try {
            const res = await dataService.chatAI(text);
            return res.reply || "¿Podrías reformular eso? Estoy aprendiendo.";
        } catch (e) {
            console.error("Error en AI chat:", e);
            return "¿Podrías reformular eso? Estoy aprendiendo.";
        }
    }
};
