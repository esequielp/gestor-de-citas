import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const branchController = {
  async getAll(req: Request, res: Response) {
    try {
      const branches = await prisma.branch.findMany({
        where: { active: true },
        include: { services: true }
      });
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener sucursales' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, address, lat, lng, image, serviceIds } = req.body;
      const branch = await prisma.branch.create({
        data: {
          name, address, lat, lng, image,
          services: {
            connect: serviceIds?.map((id: string) => ({ id })) || []
          }
        }
      });
      res.status(201).json(branch);
    } catch (error) {
      res.status(500).json({ error: 'Error creando sucursal' });
    }
  }
};