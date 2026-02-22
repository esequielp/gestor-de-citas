import { Router } from 'express';
import prisma from '../prisma/client.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Empleados
 *   description: Gestión de personal
 */

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Listar empleados
 *     tags: [Empleados]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de sucursal
 *     responses:
 *       200:
 *         description: Lista de empleados
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  const where = branchId ? { branchId: branchId as string } : {};
  const employees = await prisma.employee.findMany({
    where,
    include: { services: true }
  });
  
  res.json(employees.map(e => ({
    ...e,
    role: e.roleLabel,
    avatar: e.avatarUrl,
    serviceIds: e.services.map(s => s.serviceId)
  })));
});

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Crear empleado
 *     tags: [Empleados]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, branchId, role]
 *             properties:
 *               name:
 *                 type: string
 *               branchId:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Empleado creado
 */
router.post('/', async (req, res) => {
  const { name, branchId, role, avatar, serviceIds } = req.body;
  
  // Create employee first
  const employee = await prisma.employee.create({
    data: {
      name, 
      branchId, 
      roleLabel: role, 
      avatarUrl: avatar,
      isActive: true
    }
  });

  // Create relations
  if (serviceIds && Array.isArray(serviceIds)) {
      for (const sid of serviceIds) {
          await prisma.employeeService.create({
              data: {
                  employeeId: employee.id,
                  serviceId: sid
              }
          });
      }
  }
  
  res.status(201).json({
      ...employee,
      role: employee.roleLabel,
      avatar: employee.avatarUrl,
      serviceIds: serviceIds || []
  });
});

router.put('/:id', async (req, res) => {
    const { name, branchId, role, avatar, serviceIds, weeklySchedule } = req.body;
    
    const employee = await prisma.employee.update({
        where: { id: req.params.id },
        data: {
            name,
            branchId,
            roleLabel: role,
            avatarUrl: avatar,
            // Handle schedule if provided (simplified for MVP)
            // In a real app we'd update the Schedule model
        }
    });

    if (serviceIds && Array.isArray(serviceIds)) {
        // Clear old relations
        await prisma.employeeService.deleteMany({ where: { employeeId: req.params.id } });
        // Add new ones
        for (const sid of serviceIds) {
            await prisma.employeeService.create({
                data: {
                    employeeId: employee.id,
                    serviceId: sid
                }
            });
        }
    }

    res.json({
        ...employee,
        role: employee.roleLabel,
        avatar: employee.avatarUrl,
        serviceIds: serviceIds || []
    });
});

router.delete('/:id', async (req, res) => {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.status(204).send();
});

export default router;