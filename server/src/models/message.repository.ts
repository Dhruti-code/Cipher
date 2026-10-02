import crypto from 'node:crypto';
import { Message } from 'chat-app-shared';
import { getDb } from '../db/database';

export interface IMessageRepository {
  findById(id: string): Message | null;
  getConversationMessages(conversationId: string, limit?: number): Message[];
  create(message: { id: string; conversationId: string; senderId: string; content: string; createdAt?: string }): Message;
  markDelivered(messageId: string, recipientId: string): boolean;
  markReadUpTo(conversationId: string, recipientId: string, upToMessageId: string): string[];
  getUnreadCount(conversationId: string, userId: string): number;
}

export class MessageRepository implements IMessageRepository {
  findById(id: string): Message | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        m.id,
        m.conversation_id as conversationId,
        m.sender_id as senderId,
        m.content,
        m.created_at as createdAt,
        COALESCE(
          (SELECT ms.status FROM message_status ms WHERE ms.message_id = m.id AND ms.user_id != m.sender_id LIMIT 1),
          'sent'
        ) as deliveryState
      FROM messages m
      WHERE m.id = ?
    `);
    const row = stmt.get(id) as unknown as (Message | undefined);
    return row || null;
  }

  getConversationMessages(conversationId: string, limit: number = 100): Message[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT
        m.id,
        m.conversation_id as conversationId,
        m.sender_id as senderId,
        m.content,
        m.created_at as createdAt,
        COALESCE(
          (SELECT ms.status FROM message_status ms WHERE ms.message_id = m.id AND ms.user_id != m.sender_id LIMIT 1),
          'sent'
        ) as deliveryState
      FROM messages m
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ?
    `);
    const rows = stmt.all(conversationId, limit) as unknown as Message[];
    return rows;
  }

  create(message: { id: string; conversationId: string; senderId: string; content: string; createdAt?: string }): Message {
    const db = getDb();
    const now = message.createdAt || new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(message.id, message.conversationId, message.senderId, message.content, now);

    // Update conversation updatedAt timestamp
    const updateConvoStmt = db.prepare(`
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `);
    updateConvoStmt.run(now, message.conversationId);

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: now,
      deliveryState: 'sent',
    };
  }

  /**
   * Idempotently marks a message as delivered to a recipient.
   * If already 'read', does not downgrade to 'delivered'.
   */
  markDelivered(messageId: string, recipientId: string): boolean {
    const db = getDb();
    const msg = this.findById(messageId);
    if (!msg || msg.senderId === recipientId) {
      return false; // Cannot mark own message as delivered
    }

    const now = new Date().toISOString();
    const statusId = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO message_status (id, message_id, user_id, status, updated_at)
      VALUES (?, ?, ?, 'delivered', ?)
      ON CONFLICT(message_id, user_id)
      DO UPDATE SET
        status = CASE WHEN status = 'read' THEN 'read' ELSE 'delivered' END,
        updated_at = ?
    `);
    stmt.run(statusId, messageId, recipientId, now, now);
    return true;
  }

  /**
   * Idempotently marks all messages in a conversation up to upToMessageId as read by recipient.
   * Returns array of newly read message IDs.
   */
  markReadUpTo(conversationId: string, recipientId: string, upToMessageId: string): string[] {
    const db = getDb();
    const targetMsg = this.findById(upToMessageId);
    if (!targetMsg || targetMsg.conversationId !== conversationId) {
      return [];
    }

    // Find all unread messages sent by peer up to targetMsg.createdAt
    const queryStmt = db.prepare(`
      SELECT m.id
      FROM messages m
      WHERE m.conversation_id = ?
        AND m.sender_id != ?
        AND m.created_at <= ?
        AND NOT EXISTS (
          SELECT 1 FROM message_status ms
          WHERE ms.message_id = m.id AND ms.user_id = ? AND ms.status = 'read'
        )
      ORDER BY m.created_at ASC
    `);

    const unreadRows = queryStmt.all(conversationId, recipientId, targetMsg.createdAt, recipientId) as unknown as Array<{ id: string }>;
    if (unreadRows.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const upsertStmt = db.prepare(`
      INSERT INTO message_status (id, message_id, user_id, status, updated_at)
      VALUES (?, ?, ?, 'read', ?)
      ON CONFLICT(message_id, user_id)
      DO UPDATE SET
        status = 'read',
        updated_at = ?
    `);

    for (const row of unreadRows) {
      upsertStmt.run(crypto.randomUUID(), row.id, recipientId, now, now);
    }

    // Update conversation_participants.last_read_message_id
    const partStmt = db.prepare(`
      UPDATE conversation_participants
      SET last_read_message_id = ?
      WHERE conversation_id = ? AND user_id = ?
    `);
    partStmt.run(upToMessageId, conversationId, recipientId);

    return unreadRows.map((r) => r.id);
  }

  /**
   * Computes count of unread messages in a conversation for a specific user.
   */
  getUnreadCount(conversationId: string, userId: string): number {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      WHERE m.conversation_id = ?
        AND m.sender_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM message_status ms
          WHERE ms.message_id = m.id AND ms.user_id = ? AND ms.status = 'read'
        )
    `);
    const row = stmt.get(conversationId, userId, userId) as unknown as { count: number };
    return row?.count ?? 0;
  }
}
