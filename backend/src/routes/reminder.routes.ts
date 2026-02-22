import { Router } from 'express';
import { reminderController } from '../controllers/reminder.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recordatorios
 *   description: Procesamiento y Webhooks
 */

/**
 * @swagger
 * /reminders/process:
 *   post:
 *     summary: Ejecutar manualmente el proceso de envío de recordatorios
 *     tags: [Recordatorios]
 *     responses:
 *       200:
 *         description: Resultado del proceso
 */
router.post('/process', reminderController.process);

/**
 * @swagger
 * /webhook/n8n:
 *   post:
 *     summary: Mock endpoint para recibir payload de recordatorios (Simulación n8n)
 *     tags: [Recordatorios]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               cliente: "Juan Pérez"
 *               telefono: "+573001234567"
 *               fecha: "2026-02-20"
 *               hora: "10:00"
 *               servicio: "Corte"
 *     responses:
 *       200:
 *         description: Payload recibido
 */
router.post('/n8n', reminderController.webhookN8nMock); // Montado en /webhook/n8n por el index

export default router;