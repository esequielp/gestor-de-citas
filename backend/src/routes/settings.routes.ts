import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Configuración
 *   description: Ajustes del sistema
 */

/**
 * @swagger
 * /settings/reminders:
 *   get:
 *     summary: Obtener configuración de recordatorios
 *     tags: [Configuración]
 *     responses:
 *       200:
 *         description: Configuración actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emailReminders:
 *                   type: string
 *                   example: "24,1,0.5"
 *                 whatsappReminders:
 *                   type: string
 *                   example: "2,0.25"
 *                 n8nWebhookUrl:
 *                   type: string
 *                 n8nApiKey:
 *                   type: string
 */
router.get('/reminders', settingsController.get);

/**
 * @swagger
 * /settings/reminders:
 *   put:
 *     summary: Actualizar configuración de recordatorios
 *     description: Permite configurar múltiples alertas separadas por coma (ej. 24h antes, 1h antes, 0.25h antes).
 *     tags: [Configuración]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailReminders:
 *                 type: string
 *                 description: Lista de horas antes de la cita, separadas por coma (ej. "24,1").
 *               whatsappReminders:
 *                 type: string
 *                 description: Lista de horas antes de la cita, separadas por coma (ej. "2,0.5").
 *               n8nWebhookUrl:
 *                 type: string
 *               n8nApiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
router.put('/reminders', settingsController.update);

export default router;