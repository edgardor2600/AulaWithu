import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { topicsService } from '../services/topics.service';
import { SlidesRepository } from '../db/repositories';

const router = Router();

/**
 * POST /api/classes/:classId/topics
 * Create a new topic
 * Access: Teacher (class owner), Admin
 */
router.post(
  '/classes/:classId/topics',
  authMiddleware,
  [
    param('classId').isString().notEmpty(),
    body('title').isString().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().isString().trim(),
  ],
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const { title, description } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const topic = await topicsService.createTopic(
      classId,
      { title, description },
      userId,
      userRole
    );

    res.status(201).json({
      success: true,
      topic,
    });
  })
);

/**
 * GET /api/classes/:classId/topics
 * Get all topics for a class
 * Access: All authenticated users
 */
router.get(
  '/classes/:classId/topics',
  authMiddleware,
  [param('classId').isString().notEmpty()],
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const topics = await topicsService.getClassTopics(classId, userId, userRole);

    res.status(200).json({
      success: true,
      count: topics.length,
      topics,
    });
  })
);

/**
 * GET /api/topics/:topicId
 * Get a single topic
 * Access: All authenticated users
 */
router.get(
  '/topics/:topicId',
  authMiddleware,
  [param('topicId').isString().notEmpty()],
  asyncHandler(async (req: any, res: any) => {
    const { topicId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const topic = await topicsService.getTopic(topicId, userId, userRole);

    res.status(200).json({
      success: true,
      topic,
    });
  })
);

/**
 * GET /api/topics/:topicId/slides
 */
router.get(
  '/topics/:topicId/slides',
  authMiddleware,
  [param('topicId').isString().notEmpty()],
  asyncHandler(async (req: any, res: any) => {
    const { topicId } = req.params;
    
    const slides = await SlidesRepository.getByTopic(topicId);

    res.status(200).json({
      success: true,
      count: slides.length,
      slides,
    });
  })
);

/**
 * PUT /api/topics/:topicId
 * Update a topic
 * Access: Teacher (class owner), Admin
 */
router.put(
  '/topics/:topicId',
  authMiddleware,
  [
    param('topicId').isString().notEmpty(),
    body('title').optional().isString().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().isString().trim(),
  ],
  asyncHandler(async (req: any, res: any) => {
    const { topicId } = req.params;
    const { title, description } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const topic = await topicsService.updateTopic(
      topicId,
      { title, description },
      userId,
      userRole
    );

    res.status(200).json({
      success: true,
      topic,
    });
  })
);

/**
 * DELETE /api/topics/:topicId
 * Delete a topic (only if no slides exist)
 * Access: Teacher (class owner), Admin
 */
router.delete(
  '/topics/:topicId',
  authMiddleware,
  [param('topicId').isString().notEmpty()],
  asyncHandler(async (req: any, res: any) => {
    const { topicId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await topicsService.deleteTopic(topicId, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Topic deleted successfully',
    });
  })
);

/**
 * POST /api/classes/:classId/topics/reorder
 * Reorder topics
 * Access: Teacher (class owner), Admin
 */
router.post(
  '/classes/:classId/topics/reorder',
  authMiddleware,
  [
    param('classId').isString().notEmpty(),
    body('topicIds').isArray().notEmpty(),
  ],
  asyncHandler(async (req: any, res: any) => {
    const { classId } = req.params;
    const { topicIds } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await topicsService.reorderTopics(classId, topicIds, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Topics reordered successfully',
    });
  })
);

export default router;
