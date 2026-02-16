export interface Branch {
  id: string;
  name: string;
  address: string;
  image: string;
}

export interface WorkingHours {
  start: number; // 24h format, e.g., 8
  end: number;   // 24h format, e.g., 17
}

export interface Employee {
  id: string;
  name: string;
  branchId: string;
  role: string;
  avatar: string;
  // Simplified schedule: works every day between these hours
  schedule: WorkingHours;
  // Days off (0 = Sunday, 1 = Monday, etc.)
  daysOff: number[];
}

export interface Appointment {
  id: string;
  branchId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  time: number; // Hour start, e.g., 9 for 09:00-10:00
  clientName: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export type ViewState = 'LANDING' | 'BOOKING' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';
