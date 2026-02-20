import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';

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
router.get('/', appointmentController.getAppointments);

/**
 * @swagger
 * /availability:
 *   get:
 *     summary: Verificar disponibilidad de un empleado
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retorna true si está disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 */
router.get('/availability', appointmentController.checkAvailability);

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
router.post('/', appointmentController.createAppointment);

export default router;