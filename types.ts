export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  active: boolean;
  image?: string;
  sesiones_totales?: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  image: string;
  serviceIds: string[]; // Services offered at this branch
  lat: number;
  lng: number;
}

export interface TimeRange {
  start: number; // e.g., 8
  end: number;   // e.g., 12
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isWorkDay: boolean;
  ranges: TimeRange[]; // List of working intervals, e.g., 8-12, 14-18
}

export interface Employee {
  id: string;
  name: string;
  branchId: string;
  role: string;
  roleLabel?: string;
  avatar: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  weeklySchedule: DaySchedule[];
  serviceIds: string[]; // Services this employee can perform
  auth_user_id?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  auth_user_id?: string;
}

export interface Appointment {
  id: string;
  branchId: string;
  serviceId: string; // Linked service
  employeeId: string;
  clientId: string; // Linked client
  date: string; // YYYY-MM-DD
  time: number; // Hour start, e.g., 9 for 09:00-10:00
  clientName: string; // Snapshot for display convenience
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export type ViewState = 'LANDING' | 'BOOKING' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'B2B_LANDING' | 'CHAT_WIDGET_ONLY' | 'SERVICE_DETAILS' | 'CLIENT_PROFILE' | 'EMPLOYEE_DASHBOARD';