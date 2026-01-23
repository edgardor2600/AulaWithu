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
<<<<<<< HEAD
  static send(data: {
    sender_id: string;
    receiver_id: string;
    message: string;
  }): Message {
=======
  static async send(data: {
    sender_id: string;
    receiver_id: string;
    message: string;
  }): Promise<Message> {
>>>>>>> f404e31 (temp commit to switch branches)
    const id = generateId();

    const sql = `
      INSERT INTO messages (id, sender_id, receiver_id, message)
<<<<<<< HEAD
      VALUES (?, ?, ?, ?)
    `;

    runQuery(sql, [id, data.sender_id, data.receiver_id, data.message]);

    return this.getById(id)!;
=======
      VALUES ($1, $2, $3, $4)
    `;

    await runQuery(sql, [id, data.sender_id, data.receiver_id, data.message]);

    const msg = await this.getById(id);
    if (!msg) throw new Error('Failed to send message');
    return msg;
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get message by ID
   */
<<<<<<< HEAD
  static getById(id: string): Message | undefined {
    return getOne<Message>('SELECT * FROM messages WHERE id = ?', [id]);
=======
  static async getById(id: string): Promise<Message | undefined> {
    return await getOne<Message>('SELECT * FROM messages WHERE id = $1', [id]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get conversation between two users
   */
<<<<<<< HEAD
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
=======
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
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Mark messages in conversation as read
   */
<<<<<<< HEAD
  static markConversationAsRead(receiverId: string, senderId: string): void {
    const sql = `
      UPDATE messages 
      SET read = 1 
      WHERE receiver_id = ? 
        AND sender_id = ? 
=======
  static async markConversationAsRead(receiverId: string, senderId: string): Promise<void> {
    const sql = `
      UPDATE messages 
      SET read = 1 
      WHERE receiver_id = $1 
        AND sender_id = $2 
>>>>>>> f404e31 (temp commit to switch branches)
        AND read = 0
        AND deleted_by_receiver = 0
    `;

<<<<<<< HEAD
    runQuery(sql, [receiverId, senderId]);
=======
    await runQuery(sql, [receiverId, senderId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Get unread message count for a user
   */
<<<<<<< HEAD
  static getUnreadCount(userId: string): number {
    const result = getOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = ? 
=======
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await getOne<{ count: string | number }>(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = $1 
>>>>>>> f404e31 (temp commit to switch branches)
         AND read = 0
         AND deleted_by_receiver = 0`,
      [userId]
    );

<<<<<<< HEAD
    return result?.count || 0;
=======
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
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete message for current user (soft delete)
   */
<<<<<<< HEAD
  static deleteForUser(messageId: string, userId: string): void {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = ? THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = ? THEN 1 ELSE deleted_by_receiver END
      WHERE id = ? AND (sender_id = ? OR receiver_id = ?)
    `;

    runQuery(sql, [userId, userId, messageId, userId, userId]);
=======
  static async deleteForUser(messageId: string, userId: string): Promise<void> {
    const sql = `
      UPDATE messages 
      SET deleted_by_sender = CASE WHEN sender_id = $1 THEN 1 ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = $2 THEN 1 ELSE deleted_by_receiver END
      WHERE id = $3 AND (sender_id = $4 OR receiver_id = $5)
    `;

    await runQuery(sql, [userId, userId, messageId, userId, userId]);
>>>>>>> f404e31 (temp commit to switch branches)
  }

  /**
   * Delete entire conversation for a user
   */
<<<<<<< HEAD
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
=======
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
   */
  static async canMessage(userId1: string, userId2: string): Promise<boolean> {
    const result = await getOne<{ count: string | number }>(
>>>>>>> f404e31 (temp commit to switch branches)
      `SELECT COUNT(*) as count
       FROM teacher_students
       WHERE active = 1
         AND (
<<<<<<< HEAD
           (teacher_id = ? AND student_id = ?)
           OR (teacher_id = ? AND student_id = ?)
=======
           (teacher_id = $1 AND student_id = $2)
           OR (teacher_id = $3 AND student_id = $4)
>>>>>>> f404e31 (temp commit to switch branches)
         )`,
      [userId1, userId2, userId2, userId1]
    );

<<<<<<< HEAD
    return (result?.count || 0) > 0;
=======
    return (Number(result?.count) || 0) > 0;
>>>>>>> f404e31 (temp commit to switch branches)
  }
}
