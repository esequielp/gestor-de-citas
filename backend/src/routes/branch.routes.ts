import { Router } from 'express';
import { branchController } from '../controllers/branch.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sucursales
 *   description: Gestión de sedes
 */

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Listar todas las sucursales
 *     tags: [Sucursales]
 *     responses:
 *       200:
 *         description: Lista de sucursales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Branch'
 */
router.get('/', branchController.getAll);

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Crear una nueva sucursal
 *     tags: [Sucursales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               lat: 
 *                 type: number
 *               lng:
 *                 type: number
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sucursal creada
 */
router.post('/', branchController.create);

export default router;