import { runQuery, getOne, getAll as getAllQuery } from '../database';
import { Message } from '../../types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Repository for managing messages between teachers and students
 */
export class MessagesRepository {
  /**
   * Send a message
   */
  static send(data: {
    sender_id: string;
    receiver_id: string;
    message: string;
  }): Message {
    const id = generateId();

    const sql = `
      INSERT INTO messages (id, sender_id, receiver_id, message)
      VALUES (?, ?, ?, ?)
    `;

    runQuery(sql, [id, data.sender_id, data.receiver_id, data.message]);

    return this.getById(id)!;
  }

  /**
   * Get message by ID
   */
  static getById(id: string): Message | undefined {
    return getOne<Message>('SELECT * FROM messages WHERE id = ?', [id]);
  }

  /**
   * Get conversation between two users
   */
  static getConversation(userId1: string, userId2: string, limit: number = 100): Message[] {
    const sql = `
      SELECT * FROM messages
      WHERE (
        (sender_id = ? AND receiver_id = ? AND deleted_by_sender = 0)
        OR (sender_id = ? AND receiver_id = ? AND deleted_by_receiver = 0)
      )
      ORDER BY created_at DESC
      LIMIT ?
    `;

    return getAllQuery<Message>(sql, [userId1, userId2, userId2, userId1, limit]);
  }

  /**
   * Mark messages in conversation as read
   */
  static markConversationAsRead(receiverId: string, senderId: string): void {
    const sql = `
      UPDATE messages 
      SET read = 1 
      WHERE receiver_id = ? 
        AND sender_id = ? 
        AND read = 0
        AND deleted_by_receiver = 0
    `;

    runQuery(sql, [receiverId, senderId]);
  }

  /**
   * Get unread message count for a user
   */
  static getUnreadCount(userId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = ? 
         AND read = 0
         AND deleted_by_receiver = 0`,
      [userId]
    );

    return result?.count || 0;
  }

  /**
   * Delete message for current user (soft delete)
   */
  static deleteForUser(messageId: string, userId: string): void {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = ? THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = ? THEN 1 ELSE deleted_by_receiver END
      WHERE id = ? AND (sender_id = ? OR receiver_id = ?)
    `;

    runQuery(sql, [userId, userId, messageId, userId, userId]);
  }

  /**
   * Delete entire conversation for a user
   */
  static deleteConversation(userId: string, otherUserId: string): void {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = ? THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = ? THEN 1 ELSE deleted_by_receiver END
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
    `;

    runQuery(sql, [userId, userId, userId, otherUserId, otherUserId, userId]);
  }

  /**
   * Check if user can message another user (must be teacher-student relationship)
   */
  static canMessage(userId1: string, userId2: string): boolean {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM teacher_students
       WHERE active = 1
         AND (
           (teacher_id = ? AND student_id = ?)
           OR (teacher_id = ? AND student_id = ?)
         )`,
      [userId1, userId2, userId2, userId1]
    );

    return (result?.count || 0) > 0;
  }
}
