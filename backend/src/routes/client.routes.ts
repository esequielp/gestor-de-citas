import { Router } from 'express';
import prisma from '../prisma/client.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Gestión de clientes
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Obtener todos los clientes
 *     tags: [Clientes]
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
router.get('/', async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json(clients.map(c => ({
      ...c,
      name: c.fullName
  })));
});

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Crear o actualizar cliente (Upsert por email)
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente creado o actualizado
 */
router.post('/', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const client = await prisma.client.upsert({
      where: { email },
      update: { fullName: name, phone },
      create: { fullName: name, email, phone }
    });
    res.json({
        ...client,
        name: client.fullName
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error gestionando cliente" });
  }
});

router.get('/:id', async (req, res) => {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ ...client, name: client.fullName });
});

router.put('/:id', async (req, res) => {
    const { name, email, phone } = req.body;
    const client = await prisma.client.update({
        where: { id: req.params.id },
        data: { fullName: name, email, phone }
    });
    res.json({ ...client, name: client.fullName });
});

router.delete('/:id', async (req, res) => {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
});

export default router;