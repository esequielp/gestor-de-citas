import 'dotenv/config';
console.log('🚀 Starting server.ts...');

import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './backend/src/config/swagger.js';
import apiRoutes from './backend/src/routes/index.js';
import { reminderService } from './backend/src/services/reminder.service.js';
import cron from 'node-cron';

console.log('📦 Imports completed');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function startServer() {
  console.log('🛠️ Initializing Express app...');
  const app = express();
  const PORT = 3000;

  // Trust proxy (ngrok, reverse proxies)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA

  // CORS — restrict to same origin in production
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGIN || true
      : true,
    credentials: true,
  }));

  // Rate limiting — prevent brute force / abuse
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intenta de nuevo en un momento.' },
  });
  app.use('/api', apiLimiter);

  // Body size limit to prevent DoS
  // Higher limit for media upload endpoint (base64 files up to 16MB = ~21MB base64)
  app.use('/api/whatsapp/upload-media', express.json({ limit: '25mb' }));
  // Default limit for all other routes
  app.use(express.json({ limit: '1mb' }));

  console.log('🛣️ Setting up API routes...');
  // API Routes
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api', apiRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AgendaPro API running' });
  });

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚡ Initializing Vite in middleware mode...');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('✅ Vite middleware attached');
  } else {
    app.use(express.static('dist'));
  }

  // Catch-all route for SPA
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith('/api')) {
      return next();
    }

    try {
      let template: string;
      if (process.env.NODE_ENV !== 'production') {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexPath)) {
          console.error('❌ index.html not found at:', indexPath);
          return res.status(404).send('index.html not found');
        }
        template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      if (vite) vite.ssrFixStacktrace(e as Error);
      console.error('❌ Error serving index.html:', e);
      next(e);
    }
  });

  console.log(`📡 Attempting to listen on port ${PORT}...`);
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);

    // Scheduler: Ejecutar cada 1 minuto
    cron.schedule('* * * * *', async () => {
      try {
        await reminderService.processReminders();
      } catch (error) {
        console.error('Error en cron job:', error);
      }
    });
    console.log(`⏰ Scheduler de recordatorios activo (1 min interval)`);

    try {
      console.log('🔌 Supabase Client initialized via service role in config/supabase.ts');
    } catch (err) {
      console.error('❌ Supabase Client initialization passed', err);
    }
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
});
