import { Router } from 'express';
import { branchController } from '../controllers/branch.controller.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

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
router.post('/', branchController.create);
router.put('/:id', branchController.update);
router.delete('/:id', branchController.delete);
router.get('/:id/services', branchController.getServices);
router.get('/:id/employees', branchController.getEmployees);

export default router;