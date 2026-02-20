import { Router } from 'express';
import prisma from '../prisma/client';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Servicios
 *   description: Catálogo de servicios
 */

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Listar servicios activos
 *     tags: [Servicios]
 *     responses:
 *       200:
 *         description: Lista de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 */
router.get('/', async (req, res) => {
  const services = await prisma.service.findMany({ where: { active: true } });
  res.json(services);
});

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Crear servicio
 *     tags: [Servicios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       201:
 *         description: Servicio creado
 */
router.post('/', async (req, res) => {
  const service = await prisma.service.create({ data: req.body });
  res.status(201).json(service);
});

export default router;