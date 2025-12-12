import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { teacherOnly, studentOnly } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Test endpoint - requires authentication
router.get(
  '/protected',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    res.json({
      success: true,
      message: 'You are authenticated!',
      user: req.user,
    });
  })
);

// Test endpoint - teachers only
router.get(
  '/teacher-only',
  authMiddleware,
  teacherOnly,
  asyncHandler(async (req: any, res: any) => {
    res.json({
      success: true,
      message: 'Welcome, teacher!',
      user: req.user,
    });
  })
);

// Test endpoint - students only
router.get(
  '/student-only',
  authMiddleware,
  studentOnly,
  asyncHandler(async (req: any, res: any) => {
    res.json({
      success: true,
      message: 'Welcome, student!',
      user: req.user,
    });
  })
);

export default router;
