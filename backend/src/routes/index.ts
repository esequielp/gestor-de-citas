import { Router } from 'express';
import branchRoutes from './branch.routes.js';
import serviceRoutes from './service.routes.js';
import employeeRoutes from './employee.routes.js';
import clientRoutes from './client.routes.js';
import appointmentRoutes from './appointment.routes.js';
import settingsRoutes from './settings.routes.js';
import reminderRoutes from './reminder.routes.js';

const router = Router();

router.use('/branches', branchRoutes);
router.use('/services', serviceRoutes);
router.use('/employees', employeeRoutes);
router.use('/clients', clientRoutes);
router.use('/', appointmentRoutes); 

// Nuevas rutas
router.use('/settings', settingsRoutes);
router.use('/reminders', reminderRoutes);
router.use('/webhook', reminderRoutes); // Para exponer /webhook/n8n

export default router;