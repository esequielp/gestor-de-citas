import { Router } from 'express';
import prisma from '../prisma/client.js';

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
  const services = await prisma.service.findMany({ where: { isActive: true } });
  res.json(services.map(s => ({
    ...s,
    active: s.isActive,
    duration: s.durationMinutes
  })));
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
  const { name, description, duration, price, active } = req.body;
  const service = await prisma.service.create({ 
    data: {
      name,
      description,
      durationMinutes: duration,
      price,
      isActive: active
    } 
  });
  res.status(201).json({
    ...service,
    active: service.isActive,
    duration: service.durationMinutes
  });
});

router.put('/:id', async (req, res) => {
    const { name, description, duration, price, active } = req.body;
    const service = await prisma.service.update({
        where: { id: req.params.id },
        data: {
            name,
            description,
            durationMinutes: duration,
            price,
            isActive: active
        }
    });
    res.json({
        ...service,
        active: service.isActive,
        duration: service.durationMinutes
    });
});

router.delete('/:id', async (req, res) => {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
});

export default router;