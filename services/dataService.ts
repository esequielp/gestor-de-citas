import { Branch, Employee, Appointment, Service, Client } from '../types';
import apiClient from './apiClient';

class DataService {
  // --- Company / Tenant ---
  async getCompanyInfo(): Promise<any> {
    const res = await apiClient.get('/empresas/me');
    return res.data;
  }

  async registerCompany(data: { nombre: string, email: string, telefono: string }): Promise<any> {
    const res = await apiClient.post('/empresas', data);
    return res.data;
  }

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    const res = await apiClient.get('/clients');
    return res.data;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const res = await apiClient.get(`/clients/${id}`);
    return res.data;
  }

  async addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const res = await apiClient.post('/clients', client);
    return res.data;
  }

  async updateClient(client: Client): Promise<void> {
    await apiClient.put(`/clients/${client.id}`, client);
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/clients/${id}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    const res = await apiClient.get(`/appointments?clientId=${clientId}`);
    return res.data;
  }

  async getOrCreateClient(name: string, email: string, phone: string, auth_user_id?: string): Promise<Client> {
    // Search by email
    const clients = await this.getClients();
    const existing = clients.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      // If they just logged in with Google, we should link the auth_user_id
      if (auth_user_id && !existing.auth_user_id) {
        existing.auth_user_id = auth_user_id;
        await this.updateClient(existing);
      }
      return existing;
    }

    return this.addClient({ name, email, phone, auth_user_id });
  }

  // --- Services ---
  async getServices(): Promise<Service[]> {
    const res = await apiClient.get('/services');
    return res.data;
  }

  async getServicesByBranch(branchId: string): Promise<Service[]> {
    const res = await apiClient.get(`/branches/${branchId}/services`);
    return res.data;
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const res = await apiClient.post('/services', service);
    return res.data;
  }

  async updateService(service: Service): Promise<void> {
    await apiClient.put(`/services/${service.id}`, service);
  }

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/services/${id}`);
  }

  // --- Branches ---
  async getBranches(): Promise<Branch[]> {
    const res = await apiClient.get('/branches');
    return res.data;
  }

  async addBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
    const res = await apiClient.post('/branches', branch);
    return res.data;
  }

  async updateBranch(branch: Branch): Promise<void> {
    await apiClient.put(`/branches/${branch.id}`, branch);
  }

  async deleteBranch(id: string): Promise<void> {
    await apiClient.delete(`/branches/${id}`);
  }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
    const res = await apiClient.get('/employees');
    return res.data;
  }

  async getEmployeesByBranch(branchId: string): Promise<Employee[]> {
    const res = await apiClient.get(`/branches/${branchId}/employees`);
    return res.data;
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const res = await apiClient.get(`/employees/${id}`);
    return res.data;
  }

  async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const res = await apiClient.post('/employees', employee);
    return res.data;
  }

  async updateEmployee(employee: Employee): Promise<void> {
    await apiClient.put(`/employees/${employee.id}`, employee);
  }

  async deleteEmployee(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  }

  // --- Appointments ---
  async getAppointments(): Promise<Appointment[]> {
    const res = await apiClient.get('/appointments');
    return res.data;
  }

  async addAppointment(appt: Omit<Appointment, 'id' | 'status' | 'createdAt'>): Promise<Appointment> {
    const res = await apiClient.post('/appointments', appt);
    return res.data;
  }

  async updateAppointment(appointment: Appointment): Promise<void> {
    await apiClient.put(`/appointments/${appointment.id}`, appointment);
  }

  async deleteAppointment(id: string): Promise<void> {
    await apiClient.delete(`/appointments/${id}`);
  }

  // --- Sessions ---
  async getAppointmentSessions(appointmentId: string): Promise<any[]> {
    const res = await apiClient.get(`/appointments/${appointmentId}/sessions`);
    return res.data;
  }

  async updateSessionStatus(sessionId: string, status: string, notes?: string): Promise<void> {
    await apiClient.put(`/sessions/${sessionId}`, { estado: status, notas: notes });
  }

  // --- Employee Exceptions ---
  async getEmployeeExceptions(employeeId: string, from?: string, to?: string): Promise<any[]> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get(`/exceptions/${employeeId}`, { params });
    return res.data;
  }

  async saveException(data: { empleado_id: string, fecha: string, tipo: string, ranges?: any[], motivo?: string }): Promise<any> {
    const res = await apiClient.post('/exceptions', data);
    return res.data;
  }

  async deleteException(id: string): Promise<void> {
    await apiClient.delete(`/exceptions/${id}`);
  }

  // --- Core Logic (Horarios y Citas) ---

  async getAvailableSlots(branchId: string, serviceId: string, date: string): Promise<{ timeString: string, timeString12h: string, minutesFromMidnight: number, availableEmployeeIds: string[] }[]> {
    const res = await apiClient.get('/slots', {
      params: { branchId, serviceId, date }
    });
    return res.data;
  }

  // --- AI Features ---
  async improveServiceDescription(serviceName: string, description: string): Promise<string> {
    const res = await apiClient.post('/services/ai/improve-description', { serviceName, description });
    return res.data.description;
  }

  // --- WhatsApp & Chat ---
  async getMessages(clientId: string): Promise<any[]> {
    const res = await apiClient.get(`/whatsapp/messages/${clientId}`);
    return res.data;
  }

  async getChats(): Promise<any[]> {
    const res = await apiClient.get('/whatsapp/chats');
    return res.data;
  }

  async markAsRead(identifier: string): Promise<void> {
    await apiClient.post(`/whatsapp/read/${identifier}`);
  }

  async sendWhatsAppMessage(clientId: string, phone: string, text: string, empresaId: string, via: 'WHATSAPP' | 'WEB_CHAT' | 'WEB_CONTACT' = 'WHATSAPP'): Promise<any> {
    const res = await apiClient.post('/whatsapp/send', { clientId, phone, text, empresaId, via });
    return res.data;
  }

  async saveMessage(data: { empresaId: string, clientId?: string, nombre?: string, email?: string, phone?: string, text: string, via: 'WEB_CHAT' | 'WEB_CONTACT', tipo?: 'ENTRANTE' | 'SALIENTE' }): Promise<any> {
    const res = await apiClient.post('/whatsapp/save-direct', data);
    return res.data;
  }

  async replyContact(data: { email: string; clientName: string; originalMessage: string; replyMessage: string }): Promise<any> {
    const res = await apiClient.post('/whatsapp/reply-contact', data);
    return res.data;
  }

  async uploadMedia(fileBase64: string, fileName: string, mimeType: string): Promise<{ url: string; path: string }> {
    const res = await apiClient.post('/whatsapp/upload-media', { fileBase64, fileName, mimeType });
    return res.data;
  }

  async sendMedia(data: { phone: string; clientId?: string; mediaUrl: string; mediaType: string; caption?: string; fileName?: string }): Promise<any> {
    const res = await apiClient.post('/whatsapp/send-media', data);
    return res.data;
  }

  // --- AI Service Recommendation ---
  async recommendServiceAI(userMessage: string): Promise<{ service: Service | null; explanation: string }> {
    const res = await apiClient.post('/services/ai/recommend', { message: userMessage });
    return res.data;
  }

  async chatAI(userMessage: string): Promise<{ reply: string }> {
    const res = await apiClient.post('/services/ai/chat', { message: userMessage });
    return res.data;
  }

  // --- Chatbot Configuration per Tenant ---
  async getChatbotConfig(): Promise<{
    businessType: string;
    businessName: string;
    greeting: string;
    personality: string;
    customInstructions: string;
    enabled: boolean;
  }> {
    const res = await apiClient.get('/settings/chatbot');
    return res.data;
  }

  async updateChatbotConfig(config: {
    businessType?: string;
    businessName?: string;
    greeting?: string;
    personality?: string;
    customInstructions?: string;
    enabled?: boolean;
  }): Promise<any> {
    const res = await apiClient.put('/settings/chatbot', config);
    return res.data;
  }

  // --- Business Profile ---
  async getBusinessProfile(): Promise<any> {
    const res = await apiClient.get('/settings/profile');
    return res.data;
  }

  async updateBusinessProfile(profile: any): Promise<any> {
    const res = await apiClient.put('/settings/profile', profile);
    return res.data;
  }

  // --- Notification count (unread incoming messages) ---
  async getUnreadMessageCount(): Promise<number> {
    const res = await apiClient.get('/whatsapp/unread-count');
    return res.data.count || 0;
  }
  // --- Testimonials ---
  async getTestimonials(): Promise<any[]> {
    const res = await apiClient.get('/testimonials');
    return res.data;
  }

  async getAllAdminTestimonials(): Promise<any[]> {
    const res = await apiClient.get('/testimonials/admin');
    return res.data;
  }

  async addTestimonial(data: { client_name: string, client_image?: string, text: string, rating: number }): Promise<any> {
    const res = await apiClient.post('/testimonials', data);
    return res.data;
  }

  async approveTestimonial(id: string, is_approved: boolean): Promise<any> {
    const res = await apiClient.put(`/testimonials/${id}/approve`, { is_approved });
    return res.data;
  }

  async deleteTestimonial(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/testimonials/${id}`);
      return true;
    } catch (e) {
      return false;
    }
  }

}

export const dataService = new DataService();
