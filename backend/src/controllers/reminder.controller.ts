import { Request, Response } from 'express';
import { reminderService } from '../services/reminder.service';

export const reminderController = {
  async process(req: Request, res: Response) {
    try {
      const result = await reminderService.processReminders();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error procesando recordatorios' });
    }
  },

  // Endpoint Mock para simular la recepción del webhook de n8n o probar la integración
  async webhookN8nMock(req: Request, res: Response) {
    console.log('📨 Webhook n8n received payload:', JSON.stringify(req.body, null, 2));
    
    // Simular validación de seguridad
    const token = req.headers['authorization'];
    if (token !== 'Bearer secret-token' && token !== 'Bearer ') {
       console.warn('⚠️ Webhook recibido sin token válido (mock warning)');
    }

    res.json({ received: true, timestamp: new Date().toISOString() });
  }
};