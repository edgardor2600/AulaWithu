import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ClassService } from '../services/class.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { LevelsRepository } from '../db/repositories';

const router = Router();

// GET /api/classes/levels - Get all academic levels
router.get(
  '/levels',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const levels = await LevelsRepository.getAll();
    res.status(200).json({
      success: true,
      levels,
    });
  })
);

// POST /api/classes - Create new class (teacher or admin)
router.post(
  '/',
  authMiddleware,
  [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('levelId')
      .optional()
      .isString().withMessage('Level ID must be a string'),
    body('teacherId')
      .optional()
      .isString().withMessage('Teacher ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { title, description, levelId, teacherId } = req.body;
    const userRole = req.user.role;
    const userId = req.user.userId;

    // DEBUG: Log what we received
    console.log('📥 POST /api/classes - Received:');
    console.log('  Body:', req.body);
    console.log('  User:', { userId, userRole });
    console.log('  teacherId from body:', teacherId);

    // Determine the teacher_id based on role
    let teacher_id: string;
    
    if (userRole === 'admin') {
      // Admin must provide teacherId
      if (!teacherId) {
        console.log('❌ Admin did not provide teacherId');
        return res.status(400).json({
          success: false,
          message: 'Admin must provide teacherId when creating a class',
        });
      }
      teacher_id = teacherId;
    } else if (userRole === 'teacher') {
      // Teacher creates for themselves
      teacher_id = userId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can create classes',
      });
    }

    const newClass = await ClassService.create({
      title,
      description,
      teacher_id,
      level_id: levelId
    });

    res.status(201).json({
      success: true,
      class: newClass,
    });
  })
);

// GET /api/classes - Get classes filtered by role
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
    const userId = req.user.userId;
    const userRole = req.user.role;

    const classes = await ClassService.getAll(userId, userRole, teacherId);

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
    body('levelId')
      .optional()
      .isString().withMessage('Level ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { title, description, thumbnail_url, levelId } = req.body;
    const userId = req.user.userId;

    const updated = await ClassService.update(id, userId, {
      title,
      description,
      thumbnail_url,
      level_id: levelId
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
