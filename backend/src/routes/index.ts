import { Router } from 'express';
import tenantRoutes from './tenant.routes.js';
import branchRoutes from './branch.routes.js';
import serviceRoutes from './service.routes.js';
import employeeRoutes from './employee.routes.js';
import clientRoutes from './client.routes.js';
import appointmentRoutes from './appointment.routes.js';
import settingsRoutes from './settings.routes.js';
import reminderRoutes from './reminder.routes.js';
import widgetRoutes from './widget.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import exceptionRoutes from './exception.routes.js';
import testimonialRoutes from './testimonial.routes.js';

const router = Router();

// CRUD base API
router.use('/empresas', tenantRoutes); // Multitenant config root
router.use('/branches', branchRoutes);
router.use('/services', serviceRoutes);
router.use('/employees', employeeRoutes);
router.use('/clients', clientRoutes);

// Appointments
router.use('/', appointmentRoutes);
// Incluye: /appointments (GET/POST/PUT/DELETE) y /availability

// Settings and Integrations
router.use('/settings', settingsRoutes);
router.use('/reminders', reminderRoutes);
router.use('/webhook', reminderRoutes);

// Widget
router.use('/widget', widgetRoutes);

// WhatsApp & Chat
router.use('/whatsapp', whatsappRoutes);

// Employee Exceptions (vacaciones, horarios especiales)
router.use('/exceptions', exceptionRoutes);

// Testimonials
router.use('/testimonials', testimonialRoutes);

export default router;