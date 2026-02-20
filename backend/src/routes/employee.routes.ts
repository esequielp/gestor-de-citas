import { Router } from 'express';
import prisma from '../prisma/client';

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
  res.json(employees);
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
  const employee = await prisma.employee.create({
    data: {
      name, branchId, role, avatar,
      services: {
        connect: serviceIds?.map((id: string) => ({ id })) || []
      }
    }
  });
  res.status(201).json(employee);
});

export default router;