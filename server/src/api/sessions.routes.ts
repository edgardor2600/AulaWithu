import { Router } from 'express';
import { body, param } from 'express-validator';
import { SessionService } from '../services/session.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/sessions
 * Create a new live session (teacher only)
 */
router.post(
  '/',
  authMiddleware,
  teacherOnly,
  [
    body('class_id')
      .notEmpty().withMessage('Class ID is required')
      .isString().withMessage('Class ID must be a string'),
    body('slide_id')
      .notEmpty().withMessage('Slide ID is required')
      .isString().withMessage('Slide ID must be a string'),
    body('allow_student_draw')
      .optional()
      .isBoolean().withMessage('allow_student_draw must be a boolean'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { class_id, slide_id, allow_student_draw } = req.body;
    const teacher_id = req.user.userId;

    const session = await SessionService.create({
      class_id,
      slide_id,
      teacher_id,
      allow_student_draw,
    });

    res.status(201).json({
      success: true,
      session,
      message: 'Live session created successfully',
    });
  })
);

/**
 * POST /api/sessions/join
 * Join a session using session code (students)
 */
router.post(
  '/join',
  authMiddleware,
  [
    body('session_code')
      .notEmpty().withMessage('Session code is required')
      .isString().withMessage('Session code must be a string')
      .isLength({ min: 6, max: 6 }).withMessage('Session code must be 6 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { session_code } = req.body;
    const userId = req.user.userId;

    const session = await SessionService.joinByCode(session_code, userId);

    res.status(200).json({
      success: true,
      session,
      message: 'Joined session successfully',
    });
  })
);

/**
 * GET /api/sessions/:id
 * Get session details
 */
router.get(
  '/:id',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const session = await SessionService.getById(id);

    res.status(200).json({
      success: true,
      session,
    });
  })
);

/**
 * PUT /api/sessions/:id/permissions
 * Update session permissions (teacher only)
 */
router.put(
  '/:id/permissions',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
    body('allow_student_draw')
      .notEmpty().withMessage('allow_student_draw is required')
      .isBoolean().withMessage('allow_student_draw must be a boolean'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { allow_student_draw } = req.body;
    const teacherId = req.user.userId;

    const session = await SessionService.updatePermissions(
      id,
      teacherId,
      allow_student_draw
    );

    res.status(200).json({
      success: true,
      session,
      message: 'Permissions updated successfully',
    });
  })
);

/**
 * PUT /api/sessions/:id/slide
 * Update current slide (teacher only)
 */
router.put(
  '/:id/slide',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
    body('slide_id')
      .notEmpty().withMessage('slide_id is required')
      .isString().withMessage('slide_id must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { slide_id } = req.body;
    const teacherId = req.user.userId;

    const session = await SessionService.updateSlide(
      id,
      teacherId,
      slide_id
    );

    res.status(200).json({
      success: true,
      session,
      message: 'Slide updated successfully',
    });
  })
);

/**
 * PUT /api/sessions/:id/end
 * End a session (teacher only)
 */
router.put(
  '/:id/end',
  authMiddleware,
  teacherOnly,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const teacherId = req.user.userId;

    const session = await SessionService.end(id, teacherId);

    res.status(200).json({
      success: true,
      session,
      message: 'Session ended successfully',
    });
  })
);

/**
 * GET /api/sessions/teacher/active
 * Get all active sessions for the logged-in teacher
 */
router.get(
  '/teacher/active',
  authMiddleware,
  teacherOnly,
  asyncHandler(async (req: any, res: any) => {
    const teacherId = req.user.userId;

    const sessions = await SessionService.getActiveByTeacher(teacherId);

    res.status(200).json({
      success: true,
      sessions,
      count: sessions.length,
    });
  })
);

/**
 * GET /api/sessions/class/:classId
 * Get session history for a class (teacher only)
 */
router.get(
  '/class/:classId',
  authMiddleware,
  teacherOnly,
  [
    param('classId')
      .notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;

    const sessions = await SessionService.getByClass(classId, teacherId);

    res.status(200).json({
      success: true,
      sessions,
      count: sessions.length,
    });
  })
);

/**
 * GET /api/sessions/teacher/stats
 * Get session statistics for the logged-in teacher
 */
router.get(
  '/teacher/stats',
  authMiddleware,
  teacherOnly,
  asyncHandler(async (req: any, res: any) => {
    const teacherId = req.user.userId;

    const stats = await SessionService.getStats(teacherId);

    res.status(200).json({
      success: true,
      stats,
    });
  })
);

export default router;
