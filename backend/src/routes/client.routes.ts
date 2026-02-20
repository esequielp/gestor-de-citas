import { Router } from 'express';
import prisma from '../prisma/client';

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
  res.json(clients);
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
      update: { name, phone },
      create: { name, email, phone }
    });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: "Error gestionando cliente" });
  }
});

export default router;