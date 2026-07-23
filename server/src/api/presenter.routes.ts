import { Router } from 'express';
import { body, param } from 'express-validator';
import { PresenterRepository } from '../db/repositories/presenter-repository';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { NotFoundError } from '../utils/AppError';
import { logger } from '../utils/logger';


const router = Router();

/**
 * POST /api/presenter
 * Save or replace presenter material for a session (teachers only)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware('teacher', 'admin'),
  [
    body('session_id')
      .notEmpty().withMessage('Session ID is required')
      .isString().withMessage('Session ID must be a string'),
    body('file_name')
      .notEmpty().withMessage('File name is required')
      .isString().withMessage('File name must be a string'),
    body('file_type')
      .notEmpty().withMessage('File type is required')
      .isString().withMessage('File type must be a string'),
    body('slide_urls')
      .notEmpty().withMessage('Slide URLs are required')
      .isArray().withMessage('Slide URLs must be an array of strings'),
    body('current_slide_index')
      .optional()
      .isInt({ min: 0 }).withMessage('Current slide index must be a non-negative integer'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { session_id, file_name, file_type, slide_urls, current_slide_index } = req.body;

    try {
      const material = await PresenterRepository.saveMaterial({
        session_id,
        file_name,
        file_type,
        slide_urls,
        current_slide_index,
      });

      res.status(201).json({
        success: true,
        material,
        message: 'Presenter material saved successfully',
      });
    } catch (error: any) {
      logger.warn(`Presenter material DB persistence skipped: ${error.message}`);
      res.status(200).json({
        success: true,
        material: null,
        message: 'Presenter material loaded locally',
      });
    }
  })
);


/**
 * GET /api/presenter/:sessionId
 * Get active presenter material for a session (teachers and students can read)
 */
router.get(
  '/:sessionId',
  authMiddleware,
  [
    param('sessionId')
      .notEmpty().withMessage('Session ID is required')
      .isString().withMessage('Session ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { sessionId } = req.params;

    const material = await PresenterRepository.getMaterialBySession(sessionId);

    if (!material) {
      return res.status(200).json({
        success: true,
        material: null,
      });
    }

    res.status(200).json({
      success: true,
      material,
    });
  })
);

/**
 * PUT /api/presenter/:sessionId/slide
 * Update slide index (teachers only)
 */
router.put(
  '/:sessionId/slide',
  authMiddleware,
  roleMiddleware('teacher', 'admin'),
  [
    param('sessionId')
      .notEmpty().withMessage('Session ID is required')
      .isString().withMessage('Session ID must be a string'),
    body('current_slide_index')
      .notEmpty().withMessage('Current slide index is required')
      .isInt({ min: 0 }).withMessage('Current slide index must be a non-negative integer'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { sessionId } = req.params;
    const { current_slide_index } = req.body;

    const updated = await PresenterRepository.updateSlideIndex(sessionId, current_slide_index);

    res.status(200).json({
      success: true,
      updated,
      message: updated 
        ? 'Presenter slide index updated successfully' 
        : 'Presenter material not in DB, local update only',
    });
  })
);



/**
 * DELETE /api/presenter/:sessionId
 * Delete presenter material for a session (teachers only)
 */
router.delete(
  '/:sessionId',
  authMiddleware,
  roleMiddleware('teacher', 'admin'),
  [
    param('sessionId')
      .notEmpty().withMessage('Session ID is required')
      .isString().withMessage('Session ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { sessionId } = req.params;

    const deleted = await PresenterRepository.deleteMaterialBySession(sessionId);

    if (!deleted) {
      throw new NotFoundError('Presenter material not found for this session');
    }

    res.status(200).json({
      success: true,
      message: 'Presenter material deleted successfully',
    });
  })
);

export default router;
