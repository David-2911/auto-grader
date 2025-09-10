const express = require('express');
const router = express.Router();
const healthService = require('../services/health.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health and monitoring endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get basic system health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: System is healthy
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [UP, DEGRADED, DOWN]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/', async (req, res, next) => {
  try {
    const health = await healthService.getHealthInfo();
    
    const message = health.status === 'UP' 
      ? 'System is healthy' 
      : health.status === 'DEGRADED'
        ? 'System is degraded but operational'
        : 'System is experiencing issues';
    
    return res.success({
      status: health.status,
      timestamp: health.timestamp
    }, message);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /health/details:
 *   get:
 *     summary: Get detailed system health information (admin only)
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed system health information
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/details', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const health = await healthService.getHealthInfo();
    
    return res.success(health, 'Detailed health information');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Check database health (admin only)
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database health information
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/database', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const dbHealth = await healthService.checkDatabaseHealth();
    
    return res.success(dbHealth, 'Database health information');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /health/server:
 *   get:
 *     summary: Check server resource usage (admin only)
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server resource usage information
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/server', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const serverHealth = healthService.getServerHealth();
    
    return res.success(serverHealth, 'Server resource information');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
