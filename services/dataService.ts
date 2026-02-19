import { Branch, Employee, Appointment, Service, Client } from '../types';
import { MOCK_BRANCHES, MOCK_EMPLOYEES, INITIAL_APPOINTMENTS, HOURS_OF_OPERATION, MOCK_SERVICES, MOCK_CLIENTS } from '../constants';

class DataService {
  private branches: Branch[] = MOCK_BRANCHES;
  private employees: Employee[] = MOCK_EMPLOYEES;
  private appointments: Appointment[] = INITIAL_APPOINTMENTS;
  private services: Service[] = MOCK_SERVICES;
  private clients: Client[] = MOCK_CLIENTS;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedAppts = localStorage.getItem('appointments');
      if (storedAppts) this.appointments = JSON.parse(storedAppts);
      
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) this.employees = JSON.parse(storedEmployees);

      const storedServices = localStorage.getItem('services');
      if (storedServices) this.services = JSON.parse(storedServices);

      const storedBranches = localStorage.getItem('branches');
      if (storedBranches) this.branches = JSON.parse(storedBranches);

      const storedClients = localStorage.getItem('clients');
      if (storedClients) this.clients = JSON.parse(storedClients);
    } catch (e) {
      console.warn("LocalStorage access failed", e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('appointments', JSON.stringify(this.appointments));
      localStorage.setItem('employees', JSON.stringify(this.employees));
      localStorage.setItem('services', JSON.stringify(this.services));
      localStorage.setItem('branches', JSON.stringify(this.branches));
      localStorage.setItem('clients', JSON.stringify(this.clients));
    } catch (e) {
      console.warn("LocalStorage access failed", e);
    }
  }

  // --- Clients ---
  getClients(): Client[] {
    return this.clients;
  }

  getClientById(id: string): Client | undefined {
    return this.clients.find(c => c.id === id);
  }

  addClient(client: Omit<Client, 'id' | 'createdAt'>): Client {
    const newClient = { 
      ...client, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.clients.push(newClient);
    this.saveToStorage();
    return newClient;
  }

  updateClient(client: Client): void {
    const idx = this.clients.findIndex(c => c.id === client.id);
    if (idx !== -1) {
      this.clients[idx] = client;
      this.saveToStorage();
    }
  }

  // Returns true if deleted, false if blocked by business rules (has appointments)
  deleteClient(id: string): boolean {
    const hasAppointments = this.appointments.some(a => a.clientId === id);
    if (hasAppointments) {
      return false; 
    }
    this.clients = this.clients.filter(c => c.id !== id);
    this.saveToStorage();
    return true;
  }

  getAppointmentsByClient(clientId: string): Appointment[] {
    return this.appointments.filter(a => a.clientId === clientId).sort((a,b) => b.date.localeCompare(a.date));
  }

  // Helper for Public Booking Wizard: Find existing by email OR create new
  getOrCreateClient(name: string, email: string, phone: string): Client {
    const existing = this.clients.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return existing;
    }
    return this.addClient({ name, email, phone });
  }

  // --- Services ---
  getServices(): Service[] {
    return this.services;
  }

  getServicesByBranch(branchId: string): Service[] {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) return [];
    return this.services.filter(s => branch.serviceIds.includes(s.id) && s.active);
  }

  addService(service: Omit<Service, 'id'>): Service {
    const newService = { ...service, id: Math.random().toString(36).substr(2, 9) };
    this.services.push(newService);
    this.saveToStorage();
    return newService;
  }

  updateService(service: Service): void {
    const idx = this.services.findIndex(s => s.id === service.id);
    if (idx !== -1) {
      this.services[idx] = service;
      this.saveToStorage();
    }
  }

  deleteService(id: string): void {
    this.services = this.services.filter(s => s.id !== id);
    this.saveToStorage();
  }

  // --- Branches ---
  getBranches(): Branch[] {
    return this.branches;
  }

  addBranch(branch: Omit<Branch, 'id'>): Branch {
    const newBranch = { ...branch, id: Math.random().toString(36).substr(2, 9) };
    this.branches.push(newBranch);
    this.saveToStorage();
    return newBranch;
  }

  updateBranch(branch: Branch): void {
    const idx = this.branches.findIndex(b => b.id === branch.id);
    if (idx !== -1) {
      this.branches[idx] = branch;
      this.saveToStorage();
    }
  }

  deleteBranch(id: string): void {
    this.branches = this.branches.filter(b => b.id !== id);
    this.saveToStorage();
  }

  // --- Employees ---
  getEmployeesByBranch(branchId: string): Employee[] {
    return this.employees.filter(e => e.branchId === branchId);
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  addEmployee(employee: Omit<Employee, 'id'>): Employee {
    const newEmployee = { ...employee, id: Math.random().toString(36).substr(2, 9) };
    this.employees.push(newEmployee);
    this.saveToStorage();
    return newEmployee;
  }

  updateEmployee(updatedEmployee: Employee): void {
    const index = this.employees.findIndex(e => e.id === updatedEmployee.id);
    if (index !== -1) {
      this.employees[index] = updatedEmployee;
      this.saveToStorage();
    }
  }

  deleteEmployee(id: string): void {
    this.employees = this.employees.filter(e => e.id !== id);
    this.saveToStorage();
  }

  // --- Appointments ---
  getAppointments(): Appointment[] {
    return this.appointments;
  }

  addAppointment(appt: Omit<Appointment, 'id' | 'status' | 'createdAt'>): Appointment {
    const newAppt: Appointment = {
      ...appt,
      id: Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    this.appointments.push(newAppt);
    this.saveToStorage();
    return newAppt;
  }

  updateAppointment(appointment: Appointment): void {
    const index = this.appointments.findIndex(a => a.id === appointment.id);
    if (index !== -1) {
      this.appointments[index] = appointment;
      this.saveToStorage();
    }
  }

  deleteAppointment(id: string): void {
    this.appointments = this.appointments.filter(a => a.id !== id);
    this.saveToStorage();
  }

  // --- Core Logic ---
  
  isEmployeeAvailable(employeeId: string, date: string, time: number, serviceId?: string, excludeAppointmentId?: string): boolean {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return false;

    if (serviceId && !employee.serviceIds.includes(serviceId)) {
      return false;
    }

    const [y, m, d] = date.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const safeDayIndex = localDate.getDay();

    const dailySchedule = employee.weeklySchedule.find(s => s.dayOfWeek === safeDayIndex);

    if (!dailySchedule || !dailySchedule.isWorkDay) return false;

    const isWithinRange = dailySchedule.ranges.some(range => time >= range.start && time < range.end);
    if (!isWithinRange) return false;

    const conflict = this.appointments.find(
      a => a.employeeId === employeeId && 
           a.date === date && 
           a.time === time && 
           a.status === 'confirmed' &&
           a.id !== excludeAppointmentId
    );

    return !conflict;
  }

  getNextAvailableSlot(employeeId: string, date: string, startSearchFromTime: number, serviceId?: string): number | null {
    const possibleHours = HOURS_OF_OPERATION.filter(h => h > startSearchFromTime);
    for (const h of possibleHours) {
        if (this.isEmployeeAvailable(employeeId, date, h, serviceId)) {
            return h;
        }
    }
    return null;
  }

  getAvailableEmployeesForSlot(branchId: string, date: string, time: number, serviceId?: string): Employee[] {
    const branchEmployees = this.getEmployeesByBranch(branchId);
    return branchEmployees.filter(emp => this.isEmployeeAvailable(emp.id, date, time, serviceId));
  }
}

export const dataService = new DataService();