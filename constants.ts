import { Branch, Employee, Appointment, DaySchedule, Service, Client } from './types';

export const HOURS_OF_OPERATION = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Half-hour options for schedule editor (e.g. 8, 8.5, 9, 9.5 ...)
export const SCHEDULE_HALF_HOURS: number[] = [];
for (let h = 6; h <= 22; h++) {
  SCHEDULE_HALF_HOURS.push(h);
  if (h < 22) SCHEDULE_HALF_HOURS.push(h + 0.5);
}

export const formatScheduleHour = (val: number): string => {
  const hours = Math.floor(val);
  const mins = val % 1 === 0.5 ? '30' : '00';
  return `${hours.toString().padStart(2, '0')}:${mins}`;
};

export const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Corte de Caballero', description: 'Corte clásico o moderno con lavado incluido.', duration: 30, price: 15, active: true },
  { id: 's2', name: 'Corte de Dama', description: 'Asesoría de imagen, corte y secado.', duration: 60, price: 25, active: true },
  { id: 's3', name: 'Barba y Afeitado', description: 'Perfilado de barba con toalla caliente.', duration: 30, price: 12, active: true },
  { id: 's4', name: 'Manicure Spa', description: 'Limpieza, exfoliación y esmaltado.', duration: 45, price: 20, active: true },
  { id: 's5', name: 'Tinte y Color', description: 'Aplicación de tinte completo.', duration: 120, price: 60, active: true },
];

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'b1', name: 'Sucursal Sabaneta', address: 'Av. Las Vegas 77 Sur', image: 'https://picsum.photos/400/200?random=1',
    serviceIds: ['s1', 's2', 's3', 's4', 's5'], // Offers everything
    lat: 6.1507,
    lng: -75.6167
  },
  {
    id: 'b2', name: 'Sucursal Itagüí', address: 'Calle 50 #40-23', image: 'https://picsum.photos/400/200?random=2',
    serviceIds: ['s1', 's2', 's3'], // Only hair stuff
    lat: 6.1719,
    lng: -75.6114
  },
  {
    id: 'b3', name: 'Sucursal Envigado', address: 'Transversal 32A Sur', image: 'https://picsum.photos/400/200?random=3',
    serviceIds: ['s1', 's3', 's4'], // Barber + Nails
    lat: 6.1759,
    lng: -75.5917
  },
];

// Helper to generate a standard 9-17 schedule Mon-Sat
const createStandardSchedule = (start = 8, end = 19, daysOff = [0]): DaySchedule[] => {
  const schedule: DaySchedule[] = [];
  for (let i = 0; i < 7; i++) {
    const isOff = daysOff.includes(i);
    schedule.push({
      dayOfWeek: i,
      isWorkDay: !isOff,
      ranges: isOff ? [] : [{ start, end }]
    });
  }
  return schedule;
};

// Helper for split shift (e.g., 8-12 and 14-18)
const createSplitSchedule = (daysOff = [0]): DaySchedule[] => {
  const schedule: DaySchedule[] = [];
  for (let i = 0; i < 7; i++) {
    const isOff = daysOff.includes(i);
    schedule.push({
      dayOfWeek: i,
      isWorkDay: !isOff,
      ranges: isOff ? [] : [{ start: 9, end: 13 }, { start: 15, end: 19 }]
    });
  }
  return schedule;
};

export const MOCK_EMPLOYEES: Employee[] = [
  // Centro
  {
    id: 'e1', name: 'Ana García', branchId: 'b1', role: 'Estilista Senior',
    avatar: 'https://picsum.photos/100/100?random=1',
    weeklySchedule: createSplitSchedule([0]),
    serviceIds: ['s1', 's2', 's5'] // Hair expert
  },
  {
    id: 'e2', name: 'Carlos Ruiz', branchId: 'b1', role: 'Asistente',
    avatar: 'https://picsum.photos/100/100?random=2',
    weeklySchedule: createStandardSchedule(8, 19, [0, 6]),
    serviceIds: ['s1', 's3'] // Junior barber
  },
  {
    id: 'e3', name: 'Elena Torres', branchId: 'b1', role: 'Especialista',
    avatar: 'https://picsum.photos/100/100?random=3',
    weeklySchedule: createStandardSchedule(10, 18, [0]),
    serviceIds: ['s4'] // Manicure only
  },
  // Norte
  {
    id: 'e4', name: 'David M.', branchId: 'b2', role: 'Gerente',
    avatar: 'https://picsum.photos/100/100?random=4',
    weeklySchedule: createStandardSchedule(8, 19, [0, 6]),
    serviceIds: ['s1', 's2', 's3']
  },
  {
    id: 'e5', name: 'Sofia L.', branchId: 'b2', role: 'Estilista',
    avatar: 'https://picsum.photos/100/100?random=5',
    weeklySchedule: createStandardSchedule(12, 19, [0]),
    serviceIds: ['s2', 's5']
  },
  {
    id: 'e6', name: 'Marcos P.', branchId: 'b2', role: 'Asistente',
    avatar: 'https://picsum.photos/100/100?random=6',
    weeklySchedule: createStandardSchedule(8, 17, [0]),
    serviceIds: ['s1']
  },
  // Sur
  {
    id: 'e7', name: 'Lucia R.', branchId: 'b3', role: 'Estilista',
    avatar: 'https://picsum.photos/100/100?random=7',
    weeklySchedule: createStandardSchedule(9, 17, [0]),
    serviceIds: ['s1', 's4']
  },
  {
    id: 'e8', name: 'Jorge B.', branchId: 'b3', role: 'Barbero',
    avatar: 'https://picsum.photos/100/100?random=8',
    weeklySchedule: createStandardSchedule(10, 18, [0]),
    serviceIds: ['s1', 's3']
  },
  {
    id: 'e9', name: 'Patricia S.', branchId: 'b3', role: 'Manicurista',
    avatar: 'https://picsum.photos/100/100?random=9',
    weeklySchedule: createStandardSchedule(8, 15, [0]),
    serviceIds: ['s4']
  },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Juan Pérez', email: 'juan@demo.com', phone: '555-0101', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Maria Lopez', email: 'maria@demo.com', phone: '555-0202', createdAt: new Date().toISOString() },
  { id: 'c3', name: 'Cliente Demo', email: 'demo@demo.com', phone: '555-0000', createdAt: new Date().toISOString() },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    branchId: 'b1',
    serviceId: 's2',
    employeeId: 'e1',
    clientId: 'c3',
    date: new Date().toISOString().split('T')[0],
    time: 10,
    clientName: 'Cliente Demo',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  }
];