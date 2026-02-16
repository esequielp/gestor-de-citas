import { Branch, Employee, Appointment, WorkingHours } from '../types';
import { MOCK_BRANCHES, MOCK_EMPLOYEES, INITIAL_APPOINTMENTS, HOURS_OF_OPERATION } from '../constants';

// Simple in-memory storage with localStorage persistence for MVP
class DataService {
  private branches: Branch[] = MOCK_BRANCHES;
  private employees: Employee[] = MOCK_EMPLOYEES;
  private appointments: Appointment[] = INITIAL_APPOINTMENTS;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const storedAppts = localStorage.getItem('appointments');
    if (storedAppts) {
      this.appointments = JSON.parse(storedAppts);
    }
  }

  private saveToStorage() {
    localStorage.setItem('appointments', JSON.stringify(this.appointments));
  }

  getBranches(): Branch[] {
    return this.branches;
  }

  getEmployeesByBranch(branchId: string): Employee[] {
    return this.employees.filter(e => e.branchId === branchId);
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  updateEmployee(updatedEmployee: Employee): void {
    const index = this.employees.findIndex(e => e.id === updatedEmployee.id);
    if (index !== -1) {
      this.employees[index] = updatedEmployee;
      // Note: In this MVP, employees are not persisted to localStorage, 
      // so changes reset on page reload. Only appointments persist.
    }
  }

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

  // CORE LOGIC: Check availability
  isEmployeeAvailable(employeeId: string, date: string, time: number): boolean {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return false;

    // 1. Check schedule limits
    if (time < employee.schedule.start || time >= employee.schedule.end) return false;

    // 2. Check days off
    const dayOfWeek = new Date(date).getDay(); // 0 is Sunday
    if (employee.daysOff.includes(dayOfWeek)) return false; // Not working today

    // 3. Check existing appointments
    const conflict = this.appointments.find(
      a => a.employeeId === employeeId && a.date === date && a.time === time && a.status === 'confirmed'
    );

    return !conflict;
  }

  // Find next available slot for a specific employee on a specific date
  getNextAvailableSlot(employeeId: string, date: string, startSearchFromTime: number): number | null {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return null;
    
    // Sort operational hours
    const possibleHours = HOURS_OF_OPERATION.filter(h => h > startSearchFromTime);

    for (const h of possibleHours) {
        if (this.isEmployeeAvailable(employeeId, date, h)) {
            return h;
        }
    }
    return null;
  }

  // Get list of available employees for a specific branch/date/time
  getAvailableEmployeesForSlot(branchId: string, date: string, time: number): Employee[] {
    const branchEmployees = this.getEmployeesByBranch(branchId);
    return branchEmployees.filter(emp => this.isEmployeeAvailable(emp.id, date, time));
  }
}

export const dataService = new DataService();