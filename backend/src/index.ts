import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes/index';
import { reminderService } from './services/reminder.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas API
app.use('/api', apiRoutes);

// Health check
app.get('/', (req, res) => {
  res.send(`
    <h1>AgendaPro API 🚀</h1>
    <p>Documentación disponible en: <a href="/api/docs">/api/docs</a></p>
  `);
});

// Scheduler: Ejecutar cada 1 minuto
cron.schedule('* * * * *', async () => {
  try {
    await reminderService.processReminders();
  } catch (error) {
    console.error('Error en cron job:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📄 Documentación Swagger: http://localhost:${PORT}/api/docs`);
  console.log(`⏰ Scheduler de recordatorios activo (1 min interval)`);
});