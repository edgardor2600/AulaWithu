import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ClassService } from '../services/class.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/classes - Create new class (teacher only)
router.post(
  '/',
  authMiddleware,
  teacherOnly,
  [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { title, description } = req.body;
    const teacher_id = req.user.userId;

    const newClass = await ClassService.create({
      title,
      description,
      teacher_id,
    });

    res.status(201).json({
      success: true,
      class: newClass,
    });
  })
);

// GET /api/classes - Get all classes (optionally filter by teacher)
router.get(
  '/',
  authMiddleware,
  [
    query('teacherId')
      .optional()
      .isString().withMessage('Teacher ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { teacherId } = req.query;

    const classes = await ClassService.getAll(teacherId);

    res.status(200).json({
      success: true,
      count: classes.length,
      classes,
    });
  })
);

// GET /api/classes/:id - Get class by ID with slides
router.get(
  '/:id',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const classData = await ClassService.getById(id);

    res.status(200).json({
      success: true,
      class: classData,
    });
  })
);

// PUT /api/classes/:id - Update class (owner only)
router.put(
  '/:id',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Class ID is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('thumbnail_url')
      .optional()
      .isURL().withMessage('Thumbnail URL must be a valid URL'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { title, description, thumbnail_url } = req.body;
    const userId = req.user.userId;

    const updated = await ClassService.update(id, userId, {
      title,
      description,
      thumbnail_url,
    });

    res.status(200).json({
      success: true,
      class: updated,
    });
  })
);

// DELETE /api/classes/:id - Delete class (owner only)
router.delete(
  '/:id',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await ClassService.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully',
    });
  })
);

export default router;
