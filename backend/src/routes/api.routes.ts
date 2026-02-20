import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import prisma from '../prisma/client';

const router = Router();

// --- Rutas de Citas ---
router.get('/appointments', appointmentController.getAppointments);
router.post('/appointments', appointmentController.createAppointment);
router.get('/availability', appointmentController.checkAvailability);

// --- Rutas Rápidas (CRUD básico directo con Prisma para MVP) ---

// Services
router.get('/services', async (req, res) => {
  const services = await prisma.service.findMany({ where: { active: true } });
  res.json(services);
});

// Branches
router.get('/branches', async (req, res) => {
  const branches = await prisma.branch.findMany({ include: { services: true } });
  res.json(branches);
});

// Employees
router.get('/employees', async (req, res) => {
  const { branchId } = req.query;
  const where = branchId ? { branchId: branchId as string } : {};
  const employees = await prisma.employee.findMany({ 
    where,
    include: { services: true }
  });
  res.json(employees);
});

// Clients (Create or Find)
router.post('/clients', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const client = await prisma.client.upsert({
      where: { email },
      update: { name, phone },
      create: { name, email, phone }
    });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: "Error gestionando cliente" });
  }
});

export default router;