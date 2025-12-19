import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { MessagesService } from '../services/messages.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/messages
 * Send a message to another user
 */
router.post(
  '/',
  [
    body('receiver_id')
      .trim()
      .notEmpty()
      .withMessage('Receiver ID is required'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message cannot be empty')
      .isLength({ max: 5000 })
      .withMessage('Message is too long (max 5000 characters)'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.userId;

    const newMessage = await MessagesService.sendMessage(sender_id, receiver_id, message);

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  })
);

/**
 * GET /api/messages/conversation/:userId
 * Get conversation with a specific user
 */
router.get(
  '/conversation/:userId',
  [
    param('userId')
      .trim()
      .notEmpty()
      .withMessage('User ID is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const currentUserId = req.user.userId;

    const messages = await MessagesService.getConversation(currentUserId, userId, limit);

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  })
);

/**
 * GET /api/messages/conversations
 * Get list of all conversations
 */
router.get(
  '/conversations',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user.userId;

    const conversations = await MessagesService.getConversationsList(userId);

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  })
);

/**
 * GET /api/messages/unread-count
 * Get count of unread messages
 */
router.get(
  '/unread-count',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user.userId;

    const count = await MessagesService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unread_count: count,
    });
  })
);

/**
 * DELETE /api/messages/:messageId
 * Delete a specific message
 */
router.delete(
  '/:messageId',
  [
    param('messageId')
      .trim()
      .notEmpty()
      .withMessage('Message ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    await MessagesService.deleteMessage(messageId, userId);

    res.status(200).json({
      success: true,
      message: 'Message deleted',
    });
  })
);

/**
 * DELETE /api/messages/conversation/:userId
 * Delete entire conversation with a user
 */
router.delete(
  '/conversation/:userId',
  [
    param('userId')
      .trim()
      .notEmpty()
      .withMessage('User ID is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    await MessagesService.deleteConversation(currentUserId, userId);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted',
    });
  })
);

export default router;
