import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { backendLogger } from '../utils/logger.js';

export const appointmentController = {

  async getAppointments(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { branchId, date } = req.query;
      const appointments = await appointmentService.getAll(tenantId, {
        branchId: branchId as string,
        date: date as string
      });
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al obtener citas' });
    }
  },

  async getSlots(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { branchId, serviceId, date } = req.query;

      if (!branchId || !serviceId || !date) {
        return res.status(400).json({ error: 'Faltan parámetros: branchId, serviceId, date' });
      }

      const slots = await appointmentService.getAvailableSlots(
        tenantId,
        branchId as string,
        serviceId as string,
        date as string
      );

      res.json(slots);
    } catch (error: any) {
      backendLogger.error('AppointmentController', 'Error getSlots', { error: error.message, query: req.query });
      res.status(500).json({ error: error.message || 'Error al obtener horarios disponibles' });
    }
  },

  async createAppointment(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { branchId, serviceId, employeeId, clientId, date, time } = req.body;

      // Validación básica
      if (!branchId || !serviceId || !employeeId || !clientId || !date || time === undefined) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const newAppointment = await appointmentService.create({
        tenantId, branchId, serviceId, employeeId, clientId, date, time
      });

      res.status(201).json(newAppointment);
    } catch (error: any) {
      if (error.message.includes('SLOT_TAKEN')) {
        return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
      }
      backendLogger.error('AppointmentController', 'Error createAppointment', { error: error.message, body: req.body });
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateAppointment(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const updated = await appointmentService.update(tenantId, id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar cita' });
    }
  },

  async deleteAppointment(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      await appointmentService.delete(tenantId, id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al eliminar cita' });
    }
  },

  async getSessions(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const sessions = await appointmentService.getSessions(tenantId, id);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al obtener sesiones' });
    }
  },

  async updateSession(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const { sessionId } = req.params;
      const updated = await appointmentService.updateSession(tenantId, sessionId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error al actualizar sesión' });
    }
  }
};