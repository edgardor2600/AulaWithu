import { Router } from 'express';
import { body, param } from 'express-validator';
import { SessionService } from '../services/session.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/sessions - Start new session (teacher only)
router.post(
  '/',
  authMiddleware,
  teacherOnly,
  [
    body('class_id')
      .notEmpty().withMessage('Class ID is required')
      .isString().withMessage('Class ID must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { class_id } = req.body;
    const teacher_id = req.user.userId;

    const session = await SessionService.start({
      class_id,
      teacher_id,
    });

    res.status(201).json({
      success: true,
      session,
    });
  })
);

// GET /api/sessions/:id - Get session with participants
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

// POST /api/sessions/:id/join - Join session
router.post(
  '/:id/join',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await SessionService.join(id, userId);

    res.status(200).json(result);
  })
);

// POST /api/sessions/:id/leave - Leave session
router.post(
  '/:id/leave',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Session ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await SessionService.leave(id, userId);

    res.status(200).json({
      success: true,
      message: 'Left session successfully',
    });
  })
);

// POST /api/sessions/:id/end - End session (teacher only)
router.post(
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
    const userId = req.user.userId;

    const session = await SessionService.end(id, userId);

    res.status(200).json({
      success: true,
      session,
    });
  })
);

// GET /api/classes/:id/active-session - Get active session for class
router.get(
  '/classes/:id/active-session',
  authMiddleware,
  [
    param('id')
      .notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const session = await SessionService.getActiveByClass(id);

    if (!session) {
      return res.status(200).json({
        success: true,
        session: null,
        message: 'No active session found',
      });
    }

    res.status(200).json({
      success: true,
      session,
    });
  })
);

export default router;
