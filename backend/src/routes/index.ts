import { Router } from 'express';
import branchRoutes from './branch.routes';
import serviceRoutes from './service.routes';
import employeeRoutes from './employee.routes';
import clientRoutes from './client.routes';
import appointmentRoutes from './appointment.routes';
import settingsRoutes from './settings.routes';
import reminderRoutes from './reminder.routes';

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