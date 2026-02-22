import { Service, Branch, Employee } from '../types';

// Mock Data
const MOCK_SERVICES: (Service & { keywords: string[] })[] = [
  {
    id: '1',
    name: 'Kinesiología',
    description: 'Tratamiento para dolor y rehabilitación física.',
    durationMinutes: 60,
    price: 35000,
    isActive: true,
    keywords: ['dolor', 'espalda', 'lesion', 'rehabilitacion', 'hueso', 'musculo', 'kine']
  },
  {
    id: '2',
    name: 'Masaje Descontracturante',
    description: 'Masaje profundo para aliviar tensión muscular.',
    durationMinutes: 45,
    price: 25000,
    isActive: true,
    keywords: ['masaje', 'tension', 'relax', 'relajar', 'contractura', 'cuello']
  },
  {
    id: '3',
    name: 'Depilación Láser',
    description: 'Depilación definitiva zonas pequeñas.',
    durationMinutes: 30,
    price: 15000,
    isActive: true,
    keywords: ['depilacion', 'laser', 'vello', 'pelos', 'estetica']
  },
  {
    id: '4',
    name: 'Limpieza Facial',
    description: 'Limpieza profunda de cutis.',
    durationMinutes: 60,
    price: 30000,
    isActive: true,
    keywords: ['cara', 'facial', 'cutis', 'granos', 'piel', 'limpieza']
  }
];

const MOCK_BRANCHES: Branch[] = [
  {
    id: '1',
    name: 'Sucursal Centro',
    address: 'Av. Principal 123',
    lat: -33.4489,
    lng: -70.6693,
    isActive: true,
    imageUrl: 'https://picsum.photos/200/300',
    phone: '123456789'
  },
  {
    id: '2',
    name: 'Sucursal Norte',
    address: 'Calle Norte 456',
    lat: -33.4000,
    lng: -70.6500,
    isActive: true,
    imageUrl: 'https://picsum.photos/200/301',
    phone: '987654321'
  }
];

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    branchId: '1',
    name: 'Juan Pérez',
    roleLabel: 'Kinesiólogo',
    avatarUrl: 'https://i.pravatar.cc/150?u=1',
    isActive: true,
    userId: 'u1'
  },
  {
    id: '2',
    branchId: '1',
    name: 'María González',
    roleLabel: 'Masoterapeuta',
    avatarUrl: 'https://i.pravatar.cc/150?u=2',
    isActive: true,
    userId: 'u2'
  },
  {
    id: '3',
    branchId: '2',
    name: 'Carlos Ruiz',
    roleLabel: 'Dermatólogo',
    avatarUrl: 'https://i.pravatar.cc/150?u=3',
    isActive: true,
    userId: 'u3'
  }
];

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  async getServices() {
    await delay(800);
    return MOCK_SERVICES;
  },

  async getBranches() {
    await delay(800);
    return MOCK_BRANCHES;
  },

  async getEmployees(branchId: string, serviceId?: string) {
    await delay(800);
    // Filter by branch
    let employees = MOCK_EMPLOYEES.filter(e => e.branchId === branchId);
    // In a real app we would filter by service capability too, 
    // for now we just return all in branch or random subset
    return employees;
  },

  async getAvailability(date: string, employeeId?: string) {
    await delay(1000);
    // Mock availability: 9:00 to 18:00
    const slots = [];
    for (let i = 9; i <= 18; i++) {
      if (Math.random() > 0.3) { // 70% chance of being available
        slots.push(`${i}:00`);
      }
    }
    return slots;
  },

  async createAppointment(data: any) {
    await delay(1500);
    return {
      id: Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      ...data
    };
  },

  recommendService(text: string): Service | undefined {
    const lowerText = text.toLowerCase();
    return MOCK_SERVICES.find(service => 
      service.keywords.some(keyword => lowerText.includes(keyword))
    );
  }
};
