import { Router } from 'express';
import { body, param } from 'express-validator';
import { SlideService } from '../services/slide.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/slides/class/:classId - Create new slide (teacher only)
router.post(
  '/class/:classId',
  authMiddleware,
  teacherOnly,
  [
    param('classId')
      .notEmpty().withMessage('Class ID is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
    body('slide_number')
      .optional()
      .isInt({ min: 1 }).withMessage('Slide number must be a positive integer'),
    body('topic_id')
      .optional()
      .isString().withMessage('Topic ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const { title, slide_number, topic_id } = req.body;
    const userId = req.user.userId;

    const slide = await SlideService.create({
      class_id: classId,
      user_id: userId,
      title,
      slide_number,
      topic_id,  // Pass topic_id to service
    });

    res.status(201).json({
      success: true,
      slide,
    });
  })
);

// GET /api/slides/:id - Get slide by ID
router.get(
  '/:id',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Slide ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const slide = await SlideService.getById(id);

    res.status(200).json({
      success: true,
      slide,
    });
  })
);

// PUT /api/slides/:id - Update slide (teacher only)
router.put(
  '/:id',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Slide ID is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
    body('canvas_data')
      .optional()
      .isString().withMessage('Canvas data must be a string'),
    body('slide_number')
      .optional()
      .isInt({ min: 1 }).withMessage('Slide number must be a positive integer'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { title, canvas_data, slide_number } = req.body;
    const userId = req.user.userId;

    const updated = await SlideService.update(id, userId, {
      title,
      canvas_data,
      slide_number,
    });

    res.status(200).json({
      success: true,
      slide: updated,
    });
  })
);

// PUT /api/slides/:id/canvas - Update only canvas data (optimized for frequent updates)
router.put(
  '/:id/canvas',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Slide ID is required'),
    body('canvas_data')
      .notEmpty().withMessage('Canvas data is required')
      .isString().withMessage('Canvas data must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { canvas_data } = req.body;
    const userId = req.user.userId;

    const updated = await SlideService.updateCanvas(id, userId, canvas_data);

    res.status(200).json({
      success: true,
      slide: updated,
    });
  })
);

// DELETE /api/slides/:id - Delete slide (teacher only)
router.delete(
  '/:id',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Slide ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await SlideService.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Slide deleted successfully',
    });
  })
);

export default router;
