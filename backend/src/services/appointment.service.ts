import prisma from '../prisma/client';

interface CreateAppointmentDTO {
  branchId: string;
  serviceId: string;
  employeeId: string;
  clientId: string;
  date: string;
  time: number;
}

export const appointmentService = {
  
  // 1. Verificar disponibilidad (Lógica Core)
  async checkAvailability(employeeId: string, date: string, time: number) {
    // Buscar si ya existe una cita confirmada para ese empleado en esa hora
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        employeeId,
        date,
        time,
        status: 'confirmed'
      }
    });

    // Si existe, NO está disponible
    return !existingAppointment;
  },

  // 2. Crear Cita con validación
  async create(data: CreateAppointmentDTO) {
    // Paso 1: Validar doble reserva antes de insertar
    const isAvailable = await this.checkAvailability(data.employeeId, data.date, data.time);
    
    if (!isAvailable) {
      throw new Error("SLOT_TAKEN: El empleado no está disponible en este horario.");
    }

    // Paso 2: Crear la cita
    return await prisma.appointment.create({
      data: {
        branchId: data.branchId,
        serviceId: data.serviceId,
        employeeId: data.employeeId,
        clientId: data.clientId,
        date: data.date,
        time: data.time,
        status: 'confirmed'
      },
      include: {
        client: true,
        service: true,
        employee: true,
        branch: true
      }
    });
  },

  // 3. Obtener todas las citas (con filtros opcionales)
  async getAll(filters?: { branchId?: string; date?: string }) {
    return await prisma.appointment.findMany({
      where: {
        branchId: filters?.branchId,
        date: filters?.date
      },
      include: {
        client: true,
        service: true,
        employee: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
};