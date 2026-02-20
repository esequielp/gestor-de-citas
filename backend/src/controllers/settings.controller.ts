import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';

export const settingsController = {
  async get(req: Request, res: Response) {
    try {
      const settings = await settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Error obteniendo configuración' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const settings = await settingsService.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Error actualizando configuración' });
    }
  }
};