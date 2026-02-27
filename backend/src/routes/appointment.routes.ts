import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Gestión y reserva de citas
 */

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Obtener lista de citas
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de citas filtrada
 */
router.get('/appointments', requireTenant, appointmentController.getAppointments);

/**
 * @swagger
 * /slots:
 *   get:
 *     summary: Obtener slots de tiempos disponibles (cada 30 min) para un servicio
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Retorna un arreglo con los slots disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/slots', requireTenant, appointmentController.getSlots);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Crear una nueva reserva
 *     description: Verifica disponibilidad antes de reservar. Retorna 409 si el slot está ocupado.
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Appointment'
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *       409:
 *         description: El horario seleccionado no está disponible
 */
router.post('/appointments', requireTenant, appointmentController.createAppointment);

router.put('/appointments/:id', requireTenant, appointmentController.updateAppointment);
router.delete('/appointments/:id', requireTenant, appointmentController.deleteAppointment);

// Sesiones
router.get('/appointments/:id/sessions', requireTenant, appointmentController.getSessions);
router.put('/sessions/:sessionId', requireTenant, appointmentController.updateSession);

export default router;