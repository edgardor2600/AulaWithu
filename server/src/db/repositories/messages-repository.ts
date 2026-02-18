import { runQuery, getOne, getAll as getAllQuery } from '../database';
import { Message } from '../../types/database';
import { generateId } from '../../utils/id-generator';
import { EnrollmentsRepository } from './enrollments-repository';

/**
 * Repository for managing messages between teachers and students
 */
export class MessagesRepository {
  /**
   * Send a message
   */
  static async send(data: {
    sender_id: string;
    receiver_id: string;
    message: string;
  }): Promise<Message> {
    const id = generateId();

    const sql = `
      INSERT INTO messages (id, sender_id, receiver_id, message)
      VALUES ($1, $2, $3, $4)
    `;

    await runQuery(sql, [id, data.sender_id, data.receiver_id, data.message]);

    const msg = await this.getById(id);
    if (!msg) throw new Error('Failed to send message');
    return msg;
  }

  /**
   * Get message by ID
   */
  static async getById(id: string): Promise<Message | undefined> {
    return await getOne<Message>('SELECT * FROM messages WHERE id = $1', [id]);
  }

  /**
   * Get conversation between two users
   */
  static async getConversation(userId1: string, userId2: string, limit: number = 100): Promise<Message[]> {
    const sql = `
      SELECT * FROM messages
      WHERE (
        (sender_id = $1 AND receiver_id = $2 AND deleted_by_sender = 0)
        OR (sender_id = $3 AND receiver_id = $4 AND deleted_by_receiver = 0)
      )
      ORDER BY created_at DESC
      LIMIT $5
    `;

    return await getAllQuery<Message>(sql, [userId1, userId2, userId2, userId1, limit]);
  }

  /**
   * Mark messages in conversation as read
   */
  static async markConversationAsRead(receiverId: string, senderId: string): Promise<void> {
    const sql = `
      UPDATE messages 
      SET read = 1 
      WHERE receiver_id = $1 
        AND sender_id = $2 
        AND read = 0
        AND deleted_by_receiver = 0
    `;

    await runQuery(sql, [receiverId, senderId]);
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = $1 
         AND read = 0
         AND deleted_by_receiver = 0`,
      [userId]
    );

    return Number(result?.count) || 0;
  }

  /**
   * Get unread message count from a specific sender
   */
  static async getUnreadCountFromSender(receiverId: string, senderId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = $1 
         AND sender_id = $2
         AND read = 0
         AND deleted_by_receiver = 0`,
      [receiverId, senderId]
    );

    return Number(result?.count) || 0;
  }

  /**
   * Delete message for current user (soft delete)
   */
  static async deleteForUser(messageId: string, userId: string): Promise<void> {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = $1 THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = $2 THEN 1 ELSE deleted_by_receiver END
      WHERE id = $3 AND (sender_id = $4 OR receiver_id = $5)
    `;

    await runQuery(sql, [userId, userId, messageId, userId, userId]);
  }

  /**
   * Delete entire conversation for a user
   */
  static async deleteConversation(userId: string, otherUserId: string): Promise<void> {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = $1 THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = $2 THEN 1 ELSE deleted_by_receiver END
      WHERE (sender_id = $3 AND receiver_id = $4) 
         OR (sender_id = $5 AND receiver_id = $6)
    `;

    await runQuery(sql, [userId, userId, userId, otherUserId, otherUserId, userId]);
  }

  /**
   * Check if user can message another user
   * Now delegates to EnrollmentsRepository which checks if users share a group
   */
  static async canMessage(userId1: string, userId2: string): Promise<boolean> {
    return await EnrollmentsRepository.canMessage(userId1, userId2);
  }
}
