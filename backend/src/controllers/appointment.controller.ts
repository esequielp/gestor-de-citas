import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service';

export const appointmentController = {
  
  // GET /api/appointments
  async getAppointments(req: Request, res: Response) {
    try {
      const { branchId, date } = req.query;
      const appointments = await appointmentService.getAll({
        branchId: branchId as string,
        date: date as string
      });
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener citas' });
    }
  },

  // GET /api/availability?employeeId=X&date=Y&time=Z
  async checkAvailability(req: Request, res: Response) {
    try {
      const { employeeId, date, time } = req.query;
      
      if (!employeeId || !date || !time) {
        return res.status(400).json({ error: 'Faltan parámetros' });
      }

      const isAvailable = await appointmentService.checkAvailability(
        employeeId as string,
        date as string,
        Number(time)
      );

      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar disponibilidad' });
    }
  },

  // POST /api/appointments
  async createAppointment(req: Request, res: Response) {
    try {
      const { branchId, serviceId, employeeId, clientId, date, time } = req.body;

      // Validación básica
      if (!branchId || !serviceId || !employeeId || !clientId || !date || time === undefined) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const newAppointment = await appointmentService.create({
        branchId, serviceId, employeeId, clientId, date, time
      });

      res.status(201).json(newAppointment);
    } catch (error: any) {
      if (error.message.includes('SLOT_TAKEN')) {
        return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
      }
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};