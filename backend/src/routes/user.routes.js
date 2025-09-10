const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const { authenticate, authorize, isResourceOwner } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher, admin]
 *         description: Filter users by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, identifier, or name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        role: req.query.role,
        search: req.query.search,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };
      
      const users = await userService.getUsers(options);
      
      return res.success(users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  isResourceOwner((req) => parseInt(req.params.id)),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await userService.getUserById(userId);
      
      return res.success(user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               yearLevel:
 *                 type: string
 *               major:
 *                 type: string
 *               cumulativeGpa:
 *                 type: number
 *               department:
 *                 type: string
 *               title:
 *                 type: string
 *               officeLocation:
 *                 type: string
 *               officeHours:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:id',
  authenticate,
  isResourceOwner((req) => parseInt(req.params.id)),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Admin can update any user, but users can only update limited fields
      if (req.user.role !== 'admin') {
        // Non-admins can't update isActive status
        delete userData.isActive;
      }
      
      const user = await userService.updateUser(userId, userData);
      
      return res.success(user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      await userService.deleteUser(userId);
      
      return res.success(null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/profile',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.user.id);
      
      return res.success(user, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               yearLevel:
 *                 type: string
 *               major:
 *                 type: string
 *               department:
 *                 type: string
 *               title:
 *                 type: string
 *               officeLocation:
 *                 type: string
 *               officeHours:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/profile',
  authenticate,
  async (req, res, next) => {
    try {
      const userData = req.body;
      
      // Users can't update isActive status
      delete userData.isActive;
      
      const user = await userService.updateUser(req.user.id, userData);
      
      return res.success(user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
