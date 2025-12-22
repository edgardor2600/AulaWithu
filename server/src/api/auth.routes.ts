import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /api/auth/login
 * Login with username and password
 * 
 * Request Body:
 * - username: string (3-20 chars, case-insensitive)
 * - password: string (min 6 chars)
 * 
 * Response:
 * - success: boolean
 * - token: string (JWT)
 * - user: User object
 */
router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { username, password } = req.body;

    const result = await AuthService.login({ username, password });

    res.status(200).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
        avatar_color: result.user.avatar_color,
        created_at: result.user.created_at,
        last_login: result.user.last_login,
      },
    });
  })
);

/**
 * POST /api/auth/register/teacher
 * Register a new teacher account
 * 
 * Request Body:
 * - name: string (2-100 chars)
 * - username: string (3-20 chars, unique)
 * - password: string (min 6 chars)
 * 
 * Response:
 * - success: boolean
 * - token: string (JWT)
 * - user: User object
 */
router.post(
  '/register/teacher',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]+$/).withMessage('Name can only contain letters, spaces, and common punctuation'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
      .toLowerCase(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 72 }).withMessage('Password must be between 6 and 72 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, username, password } = req.body;

    const result = await AuthService.registerTeacher({ name, username, password });

    res.status(201).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
        avatar_color: result.user.avatar_color,
        created_at: result.user.created_at,
      },
    });
  })
);

/**
 * POST /api/auth/register/student
 * Register a new student account
 * 
 * Request Body:
 * - name: string (2-100 chars)
 * - username: string (3-20 chars, unique)
 * - password: string (min 6 chars)
 * 
 * Response:
 * - success: boolean
 * - token: string (JWT)
 * - user: User object
 */
router.post(
  '/register/student',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]+$/).withMessage('Name can only contain letters, spaces, and common punctuation'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
      .toLowerCase(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 72 }).withMessage('Password must be between 6 and 72 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { name, username, password } = req.body;

    const result = await AuthService.registerStudent({ name, username, password });

    res.status(201).json({
      success: true,
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
        avatar_color: result.user.avatar_color,
        created_at: result.user.created_at,
      },
    });
  })
);

/**
 * POST /api/auth/change-password
 * Change current user's password
 * Requires authentication
 * 
 * Request Body:
 * - oldPassword: string
 * - newPassword: string (min 6 chars)
 * 
 * Response:
 * - success: boolean
 * - message: string
 */
router.post(
  '/change-password',
  authMiddleware,
  [
    body('oldPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6, max: 72 }).withMessage('New password must be between 6 and 72 characters')
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    await AuthService.changePassword(userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user information
 * Requires authentication
 * 
 * Response:
 * - success: boolean
 * - user: User object (with all fields including username, last_login)
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const user = await AuthService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    // Return user with all relevant fields (excluding password_hash)
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar_color: user.avatar_color,
        active: user.active === 1,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    });
  })
);

// ============================================
// LEGACY ENDPOINT (Backward Compatibility)
// ============================================

/**
 * POST /api/auth/join
 * Legacy endpoint for simple name-based authentication
 * @deprecated Use /api/auth/login or /api/auth/register instead
 * Kept for backward compatibility during migration
 * 
 * Request Body:
 * - name: string
 * - role: 'teacher' | 'student'
 * 
 * Response:
 * - success: boolean
 * - token: string
 * - user: User object
 */
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

export default router;
