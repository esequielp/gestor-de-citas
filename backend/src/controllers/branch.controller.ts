import { Request, Response } from 'express';
import prisma from '../prisma/client.js';

export const branchController = {
  async getAll(req: Request, res: Response) {
    try {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        include: { branchServices: true }
      });
      res.json(branches.map(b => ({
          ...b,
          image: b.imageUrl,
          serviceIds: b.branchServices.map(bs => bs.serviceId)
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener sucursales' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, address, lat, lng, image, serviceIds } = req.body;
      const branch = await prisma.branch.create({
        data: {
          name, address, lat, lng, imageUrl: image,
          isActive: true
        }
      });

      if (serviceIds && Array.isArray(serviceIds)) {
          for (const sid of serviceIds) {
              await prisma.branchService.create({
                  data: {
                      branchId: branch.id,
                      serviceId: sid
                  }
              });
          }
      }

      res.status(201).json({
          ...branch,
          image: branch.imageUrl,
          serviceIds: serviceIds || []
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creando sucursal' });
    }
  },

  async getServices(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branchServices = await prisma.branchService.findMany({
        where: { branchId: id },
        include: { service: true }
      });
      res.json(branchServices.map(bs => ({
          ...bs.service,
          active: bs.service.isActive,
          duration: bs.service.durationMinutes
      })));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener servicios de la sucursal' });
    }
  },

  async getEmployees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employees = await prisma.employee.findMany({
        where: { branchId: id },
        include: { services: true }
      });
      res.json(employees.map(e => ({
          ...e,
          role: e.roleLabel,
          avatar: e.avatarUrl,
          serviceIds: e.services.map(s => s.serviceId)
      })));
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener empleados de la sucursal' });
    }
  }
};