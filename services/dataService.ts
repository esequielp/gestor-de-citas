import { Branch, Employee, Appointment, Service, Client } from '../types';
import apiClient from './apiClient';

class DataService {
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

  async getOrCreateClient(name: string, email: string, phone: string): Promise<Client> {
    // Search by email
    const clients = await this.getClients();
    const existing = clients.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (existing) return existing;
    
    return this.addClient({ name, email, phone });
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

  // --- Core Logic ---
  
  async isEmployeeAvailable(employeeId: string, date: string, time: number, serviceId?: string): Promise<boolean> {
    const res = await apiClient.get('/availability', {
      params: { employeeId, date, time }
    });
    return res.data.available;
  }

  async getAvailableEmployeesForSlot(branchId: string, date: string, time: number, serviceId?: string): Promise<Employee[]> {
    // This is inefficient but works for MVP without changing backend too much
    const employees = await this.getEmployeesByBranch(branchId);
    const available: Employee[] = [];
    
    for (const emp of employees) {
      if (serviceId && !emp.serviceIds.includes(serviceId)) continue;
      
      const isFree = await this.isEmployeeAvailable(emp.id, date, time);
      if (isFree) available.push(emp);
    }
    return available;
  }
}

export const dataService = new DataService();
