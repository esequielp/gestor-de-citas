import { Branch, Employee, Appointment } from './types';

export const HOURS_OF_OPERATION = [8, 9, 10, 11, 12, 13, 14, 15, 16]; // 8:00 to 16:00 (ends at 17:00)

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Sucursal Centro', address: 'Av. Principal 123', image: 'https://picsum.photos/400/200?random=1' },
  { id: 'b2', name: 'Sucursal Norte', address: 'Calle Los Pinos 45', image: 'https://picsum.photos/400/200?random=2' },
  { id: 'b3', name: 'Sucursal Sur', address: 'Boulevard del Sol 890', image: 'https://picsum.photos/400/200?random=3' },
];

export const MOCK_EMPLOYEES: Employee[] = [
  // Centro
  { id: 'e1', name: 'Ana García', branchId: 'b1', role: 'Estilista Senior', avatar: 'https://picsum.photos/100/100?random=1', schedule: { start: 8, end: 17 }, daysOff: [0] },
  { id: 'e2', name: 'Carlos Ruiz', branchId: 'b1', role: 'Asistente', avatar: 'https://picsum.photos/100/100?random=2', schedule: { start: 9, end: 16 }, daysOff: [0, 6] },
  { id: 'e3', name: 'Elena Torres', branchId: 'b1', role: 'Especialista', avatar: 'https://picsum.photos/100/100?random=3', schedule: { start: 10, end: 17 }, daysOff: [0] },
  // Norte
  { id: 'e4', name: 'David M.', branchId: 'b2', role: 'Gerente', avatar: 'https://picsum.photos/100/100?random=4', schedule: { start: 8, end: 14 }, daysOff: [0, 6] },
  { id: 'e5', name: 'Sofia L.', branchId: 'b2', role: 'Estilista', avatar: 'https://picsum.photos/100/100?random=5', schedule: { start: 12, end: 17 }, daysOff: [0] },
  { id: 'e6', name: 'Marcos P.', branchId: 'b2', role: 'Asistente', avatar: 'https://picsum.photos/100/100?random=6', schedule: { start: 8, end: 17 }, daysOff: [0] },
  // Sur
  { id: 'e7', name: 'Lucia R.', branchId: 'b3', role: 'Estilista', avatar: 'https://picsum.photos/100/100?random=7', schedule: { start: 9, end: 17 }, daysOff: [0] },
  { id: 'e8', name: 'Jorge B.', branchId: 'b3', role: 'Barbero', avatar: 'https://picsum.photos/100/100?random=8', schedule: { start: 10, end: 17 }, daysOff: [0] },
  { id: 'e9', name: 'Patricia S.', branchId: 'b3', role: 'Manicurista', avatar: 'https://picsum.photos/100/100?random=9', schedule: { start: 8, end: 15 }, daysOff: [0] },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'a1', branchId: 'b1', employeeId: 'e1', date: new Date().toISOString().split('T')[0], time: 10, clientName: 'Cliente Demo', status: 'confirmed', createdAt: new Date().toISOString() }
];
