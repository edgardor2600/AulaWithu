import { Router } from 'express';
import { body, param } from 'express-validator';
import { SnapshotService } from '../services/snapshot.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { studentOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/snapshots - Save student copy (student only)
router.post(
  '/',
  authMiddleware,
  studentOnly,
  [
    body('slide_id')
      .notEmpty().withMessage('Slide ID is required')
      .isString().withMessage('Slide ID must be a string'),
    body('canvas_data')
      .notEmpty().withMessage('Canvas data is required')
      .isString().withMessage('Canvas data must be a string'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { slide_id, canvas_data } = req.body;
    const student_id = req.user.userId;

    const snapshot = await SnapshotService.save({
      slide_id,
      student_id,
      canvas_data,
    });

    res.status(201).json({
      success: true,
      snapshot,
    });
  })
);

// GET /api/snapshots/my-copies - Get my copies (student only)
router.get(
  '/my-copies',
  authMiddleware,
  studentOnly,
  asyncHandler(async (req: any, res: any) => {
    const student_id = req.user.userId;

    const copies = await SnapshotService.getByStudent(student_id);

    res.status(200).json({
      success: true,
      count: copies.length,
      copies,
    });
  })
);

// GET /api/snapshots/:id - Get snapshot by ID (student only, own snapshots)
router.get(
  '/:id',
  authMiddleware,
  studentOnly,
  [
    param('id')
      .notEmpty().withMessage('Snapshot ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const snapshot = await SnapshotService.getById(id, userId);

    res.status(200).json({
      success: true,
      snapshot,
    });
  })
);

// DELETE /api/snapshots/:id - Delete snapshot (student only, own snapshots)
router.delete(
  '/:id',
  authMiddleware,
  studentOnly,
  [
    param('id')
      .notEmpty().withMessage('Snapshot ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await SnapshotService.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Snapshot deleted successfully',
    });
  })
);

export default router;
