import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/auth/join - Join (login or register)
router.post(
  '/join',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isIn(['teacher', 'student']).withMessage('Role must be either teacher or student'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, role } = req.body;

    const result = await AuthService.join({ name, role });

    res.status(200).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        avatar_color: result.user.avatar_color,
        created_at: result.user.created_at,
      },
    });
  })
);

// GET /api/auth/me - Get current user info
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const user = await AuthService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar_color: user.avatar_color,
        created_at: user.created_at,
      },
    });
  })
);

export default router;
