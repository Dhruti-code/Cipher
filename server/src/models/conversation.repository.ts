import { Conversation, ConversationParticipant, ConversationWithDetails, UserSummary, Message } from 'chat-app-shared';
import { getDb } from '../db/database';

export interface IConversationRepository {
  findById(id: string): Conversation | null;
  findDirectConversation(userAId: string, userBId: string): Conversation | null;
  getUserConversations(userId: string): ConversationWithDetails[];
  createDirect(id: string, userAId: string, userBId: string): Conversation;
  getParticipants(conversationId: string): ConversationParticipant[];
  getConversationWithDetails(conversationId: string, forUserId?: string): ConversationWithDetails | null;
}

export class ConversationRepository implements IConversationRepository {
  findById(id: string): Conversation | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, type, title, created_at as createdAt, updated_at as updatedAt
      FROM conversations
      WHERE id = ?
    `);
    const row = stmt.get(id) as unknown as (Conversation | undefined);
    return row || null;
  }

  /**
   * Finds an existing direct 1-to-1 conversation between userA and userB.
   * Ensures duplicate direct conversations are never created.
   */
  findDirectConversation(userAId: string, userBId: string): Conversation | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT c.id, c.type, c.title, c.created_at as createdAt, c.updated_at as updatedAt
      FROM conversations c
      JOIN conversation_participants p1 ON c.id = p1.conversation_id
      JOIN conversation_participants p2 ON c.id = p2.conversation_id
      WHERE c.type = 'direct'
        AND p1.user_id = ?
        AND p2.user_id = ?
      LIMIT 1
    `);
    const row = stmt.get(userAId, userBId) as unknown as (Conversation | undefined);
    return row || null;
  }

  /**
   * Creates a new direct conversation and registers both participants atomically.
   */
  createDirect(id: string, userAId: string, userBId: string): Conversation {
    const db = getDb();
    const now = new Date().toISOString();

    const insertConvo = db.prepare(`
      INSERT INTO conversations (id, type, title, created_at, updated_at)
      VALUES (?, 'direct', NULL, ?, ?)
    `);
    insertConvo.run(id, now, now);

    const insertParticipant = db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_message_id)
      VALUES (?, ?, ?, NULL)
    `);
    insertParticipant.run(id, userAId, now);
    insertParticipant.run(id, userBId, now);

    return {
      id,
      type: 'direct',
      title: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Gets participants for a conversation.
   */
  getParticipants(conversationId: string): ConversationParticipant[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT conversation_id as conversationId, user_id as userId, joined_at as joinedAt, last_read_message_id as lastReadMessageId
      FROM conversation_participants
      WHERE conversation_id = ?
    `);
    return stmt.all(conversationId) as unknown as ConversationParticipant[];
  }

  /**
   * Returns conversation with participants and latest message preview.
   */
  getConversationWithDetails(conversationId: string, forUserId?: string): ConversationWithDetails | null {
    const convo = this.findById(conversationId);
    if (!convo) return null;

    const db = getDb();
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.last_seen_at as lastSeenAt
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ?
      ORDER BY u.username ASC
    `);

    const rawParticipants = stmt.all(conversationId) as unknown as Array<{ id: string; username: string; lastSeenAt: string }>;
    const participants: UserSummary[] = rawParticipants.map((p) => ({
      id: p.id,
      username: p.username,
      isOnline: false,
      lastSeenAt: p.lastSeenAt,
    }));

    const lastMsgStmt = db.prepare(`
      SELECT id, conversation_id as conversationId, sender_id as senderId, content, created_at as createdAt
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const lastMsg = lastMsgStmt.get(conversationId) as unknown as (Message | undefined);

    let unreadCount = 0;
    if (forUserId) {
      const unreadStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM messages m
        WHERE m.conversation_id = ?
          AND m.sender_id != ?
          AND NOT EXISTS (
            SELECT 1 FROM message_status ms
            WHERE ms.message_id = m.id AND ms.user_id = ? AND ms.status = 'read'
          )
      `);
      const row = unreadStmt.get(conversationId, forUserId, forUserId) as unknown as { count: number };
      unreadCount = row?.count ?? 0;
    }

    return {
      ...convo,
      participants,
      lastMessage: lastMsg || null,
      unreadCount,
    };
  }

  /**
   * Retrieves all conversations for a user with participant details, ordered by updatedAt DESC,
   * including persistent unreadCount.
   */
  getUserConversations(userId: string): ConversationWithDetails[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT c.id, c.type, c.title, c.created_at as createdAt, c.updated_at as updatedAt
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC
    `);

    const convos = stmt.all(userId) as unknown as Conversation[];

    const participantStmt = db.prepare(`
      SELECT u.id, u.username, u.last_seen_at as lastSeenAt
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ?
      ORDER BY u.username ASC
    `);

    const lastMsgStmt = db.prepare(`
      SELECT id, conversation_id as conversationId, sender_id as senderId, content, created_at as createdAt
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const unreadStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      WHERE m.conversation_id = ?
        AND m.sender_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM message_status ms
          WHERE ms.message_id = m.id AND ms.user_id = ? AND ms.status = 'read'
        )
    `);

    return convos.map((convo) => {
      const rawParticipants = participantStmt.all(convo.id) as unknown as Array<{ id: string; username: string; lastSeenAt: string }>;
      const participants: UserSummary[] = rawParticipants.map((p) => ({
        id: p.id,
        username: p.username,
        isOnline: false,
        lastSeenAt: p.lastSeenAt,
      }));

      const lastMsg = lastMsgStmt.get(convo.id) as unknown as (Message | undefined);
      const unreadRow = unreadStmt.get(convo.id, userId, userId) as unknown as { count: number };

      return {
        ...convo,
        participants,
        lastMessage: lastMsg || null,
        unreadCount: unreadRow?.count ?? 0,
      };
    });
  }
}
