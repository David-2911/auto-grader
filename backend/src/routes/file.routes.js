const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload and processing endpoints
 */

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload and process a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ocrEngine
 *         schema:
 *           type: string
 *           enum: [tesseract, gvision, textract]
 *         description: Preferred OCR engine to use
 *       - in: query
 *         name: noCache
 *         schema:
 *           type: boolean
 *         description: Whether to bypass the cache
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submission:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (PDF, image, or document)
 *     responses:
 *       200:
 *         description: File uploaded and processed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/upload',
  authenticate,
  uploadMiddleware.single('submission', true),
  fileController.uploadAndProcess
);

/**
 * @swagger
 * /files/upload-pdf:
 *   post:
 *     summary: Upload PDF file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissionPdf:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload
 *     responses:
 *       200:
 *         description: PDF uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/upload-pdf',
  authenticate,
  uploadMiddleware.single('submissionPdf', true),
  fileController.uploadAndProcess
);

/**
 * @swagger
 * /files/upload-image:
 *   post:
 *     summary: Upload image file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissionImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/upload-image',
  authenticate,
  uploadMiddleware.single('submissionImage', true),
  fileController.uploadAndProcess
);

/**
 * @swagger
 * /files/upload-document:
 *   post:
 *     summary: Upload document file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissionDocument:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/upload-document',
  authenticate,
  uploadMiddleware.single('submissionDocument', true),
  fileController.uploadAndProcess
);

/**
 * @swagger
 * /files/convert-to-notebook:
 *   post:
 *     summary: Upload PDF and convert to Jupyter notebook
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ocrEngine
 *         schema:
 *           type: string
 *           enum: [tesseract, gvision, textract]
 *         description: OCR engine to use
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissionPdf:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to convert
 *     responses:
 *       200:
 *         description: PDF converted to notebook successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/convert-to-notebook',
  authenticate,
  authorize('teacher', 'admin'),
  uploadMiddleware.single('submissionPdf'),
  fileController.uploadAndConvertToNotebook
);

/**
 * @swagger
 * /files/batch-upload:
 *   post:
 *     summary: Upload and process multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ocrEngine
 *         schema:
 *           type: string
 *           enum: [tesseract, gvision, textract]
 *         description: Preferred OCR engine to use
 *       - in: query
 *         name: noCache
 *         schema:
 *           type: boolean
 *         description: Whether to bypass the cache
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *     responses:
 *       200:
 *         description: Files processed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/batch-upload',
  authenticate,
  uploadMiddleware.multiple('submissions', 20, true),
  fileController.processBatch
);

/**
 * @swagger
 * /files/processing-status:
 *   get:
 *     summary: Get processing status
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Processing status retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/processing-status',
  authenticate,
  fileController.getProcessingStatus
);

/**
 * @swagger
 * /files/clear-cache:
 *   post:
 *     summary: Clear processing cache (admin only)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/clear-cache',
  authenticate,
  authorize('admin'),
  fileController.clearProcessingCache
);

module.exports = router;
