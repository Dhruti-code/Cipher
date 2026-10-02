import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'node:crypto';
import { SOCKET_EVENTS, ApiResponse, Message, SocketPresencePayload } from 'chat-app-shared';
import { AuthenticatedSocket, SocketGatewayOptions } from './socket.types';
import { UserRepository } from '../models/user.repository';
import { ConversationRepository } from '../models/conversation.repository';
import { MessageRepository } from '../models/message.repository';

let ioInstance: SocketIOServer | null = null;
const userRepo = new UserRepository();
const convoRepo = new ConversationRepository();
const messageRepo = new MessageRepository();

const MAX_MESSAGE_LENGTH = 2000;

// ─── In-Memory Presence Registry (Multi-Socket Aware) ────────────────────────
// Maps userId -> Set of active socket IDs
const userSockets = new Map<string, Set<string>>();
// Maps socketId -> userId for fast reverse lookup on disconnect
const socketToUser = new Map<string, string>();

function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

function getRelevantPeerIds(userId: string): string[] {
  try {
    const convos = convoRepo.getUserConversations(userId);
    const peerIds = new Set<string>();
    for (const c of convos) {
      for (const p of c.participants) {
        if (p.id !== userId) {
          peerIds.add(p.id);
        }
      }
    }
    return Array.from(peerIds);
  } catch (err) {
    console.error('[Presence] Error finding relevant peers:', err);
    return [];
  }
}

function broadcastPresence(io: SocketIOServer, userId: string, status: 'online' | 'offline') {
  const peers = getRelevantPeerIds(userId);
  const payload: SocketPresencePayload = { userId, status };
  peers.forEach((peerId) => {
    io.to(`user:${peerId}`).emit(SOCKET_EVENTS.SERVER_PRESENCE_UPDATE, payload);
  });
}

function registerUserSocket(io: SocketIOServer, socket: AuthenticatedSocket, userId: string, username: string) {
  socket.userId = userId;
  socket.username = username;
  socketToUser.set(socket.id, userId);

  // Each user joins their personal user room for targeted notifications & presence
  socket.join(`user:${userId}`);

  let existing = userSockets.get(userId);
  const wasOffline = !existing || existing.size === 0;

  if (!existing) {
    existing = new Set();
    userSockets.set(userId, existing);
  }
  existing.add(socket.id);

  if (wasOffline) {
    console.log(`[Presence] User ${username} (${userId}) came ONLINE (${existing.size} socket(s))`);
    broadcastPresence(io, userId, 'online');
  } else {
    console.log(`[Presence] User ${username} added socket (${existing.size} active socket(s))`);
  }
}

function unregisterUserSocket(io: SocketIOServer, socket: AuthenticatedSocket) {
  const userId = socket.userId || socketToUser.get(socket.id);
  if (!userId) return;

  socketToUser.delete(socket.id);
  const existing = userSockets.get(userId);
  if (existing) {
    existing.delete(socket.id);

    // Clean up typing state across user's conversations upon socket disconnect
    try {
      const convos = convoRepo.getUserConversations(userId);
      for (const c of convos) {
        io.to(c.id).emit(SOCKET_EVENTS.SERVER_USER_TYPING, {
          conversationId: c.id,
          userId,
          username: socket.username || 'User',
          isTyping: false,
        });
      }
    } catch {
      // Ignored on teardown
    }

    if (existing.size === 0) {
      userSockets.delete(userId);
      console.log(`[Presence] User ${socket.username || userId} went OFFLINE (0 sockets remaining)`);
      broadcastPresence(io, userId, 'offline');
    } else {
      console.log(`[Presence] Socket disconnected for ${socket.username || userId} (${existing.size} remaining)`);
    }
  }
}

/**
 * Initializes the Socket.IO server on top of the HTTP server.
 * Implements room security, message validation, SQLite persistence,
 * in-memory presence tracking, typing indicators, delivery & read tracking.
 */
export function initSocketGateway(httpServer: HttpServer, options: SocketGatewayOptions): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: options.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const authUserId = socket.handshake.auth?.userId || socket.handshake.headers?.['x-user-id'];
    if (authUserId && typeof authUserId === 'string') {
      const user = userRepo.findById(authUserId);
      if (user) {
        socket.userId = user.id;
        socket.username = user.username;
      }
    }
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.IO] Connected: ${socket.id} (user: ${socket.username || 'unauthenticated'})`);

    if (socket.userId && socket.username) {
      registerUserSocket(io, socket, socket.userId, socket.username);
    }

    socket.on(SOCKET_EVENTS.CLIENT_CONNECT_USER, (payload: { userId: string }, callback?: (res: ApiResponse) => void) => {
      if (payload?.userId) {
        const user = userRepo.findById(payload.userId);
        if (user) {
          registerUserSocket(io, socket, user.id, user.username);
          console.log(`[Socket.IO] Socket ${socket.id} authenticated as ${user.username}`);
          callback?.({ success: true, message: `Authenticated as ${user.username}` });
          return;
        }
      }
      callback?.({ success: false, error: 'Invalid user ID' });
    });

    // ─── Room Management: Join Conversation ─────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_JOIN_CONVERSATION,
      (payload: { conversationId: string }, callback?: (res: ApiResponse<{ conversationId: string }>) => void) => {
        const { conversationId } = payload || {};

        if (!socket.userId) {
          const err = 'Authentication required to join conversation.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        if (!conversationId || typeof conversationId !== 'string') {
          const err = 'Conversation ID is required.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        const convo = convoRepo.findById(conversationId);
        if (!convo) {
          const err = 'Conversation not found.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          const err = 'You are not a participant in this conversation.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        socket.join(conversationId);
        console.log(`[Socket.IO] User ${socket.username} joined room: ${conversationId}`);
        callback?.({ success: true, data: { conversationId } });
      }
    );

    // ─── Room Management: Leave Conversation ────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_LEAVE_CONVERSATION,
      (payload: { conversationId: string }, callback?: (res: ApiResponse) => void) => {
        const { conversationId } = payload || {};
        if (conversationId && typeof conversationId === 'string') {
          socket.leave(conversationId);
          console.log(`[Socket.IO] User ${socket.username} left room: ${conversationId}`);

          if (socket.userId) {
            socket.to(conversationId).emit(SOCKET_EVENTS.SERVER_USER_TYPING, {
              conversationId,
              userId: socket.userId,
              username: socket.username || 'User',
              isTyping: false,
            });
          }
        }
        callback?.({ success: true });
      }
    );

    // ─── Typing Indicators ───────────────────────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_TYPING_START,
      (payload: { conversationId: string }, callback?: (res: ApiResponse) => void) => {
        const { conversationId } = payload || {};

        if (!socket.userId) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        if (!conversationId || typeof conversationId !== 'string') {
          callback?.({ success: false, error: 'Conversation ID required' });
          return;
        }

        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          callback?.({ success: false, error: 'Not a participant in this conversation' });
          return;
        }

        socket.to(conversationId).emit(SOCKET_EVENTS.SERVER_USER_TYPING, {
          conversationId,
          userId: socket.userId,
          username: socket.username || 'User',
          isTyping: true,
        });

        callback?.({ success: true });
      }
    );

    socket.on(
      SOCKET_EVENTS.CLIENT_TYPING_STOP,
      (payload: { conversationId: string }, callback?: (res: ApiResponse) => void) => {
        const { conversationId } = payload || {};

        if (!socket.userId || !conversationId) {
          callback?.({ success: false });
          return;
        }

        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          callback?.({ success: false });
          return;
        }

        socket.to(conversationId).emit(SOCKET_EVENTS.SERVER_USER_TYPING, {
          conversationId,
          userId: socket.userId,
          username: socket.username || 'User',
          isTyping: false,
        });

        callback?.({ success: true });
      }
    );

    // ─── Presence Query ───────────────────────────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_GET_PRESENCE,
      (payload: { targetUserId: string }, callback?: (res: ApiResponse<{ status: 'online' | 'offline' }>) => void) => {
        const { targetUserId } = payload || {};

        if (!socket.userId) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        if (!targetUserId || typeof targetUserId !== 'string') {
          callback?.({ success: false, error: 'Target user ID required' });
          return;
        }

        const online = isUserOnline(targetUserId);
        callback?.({
          success: true,
          data: { status: online ? 'online' : 'offline' },
        });
      }
    );

    // ─── Delivery Acknowledgement (Phase 5) ──────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_MARK_DELIVERED,
      (payload: { conversationId: string; messageId: string }, callback?: (res: ApiResponse) => void) => {
        const { conversationId, messageId } = payload || {};

        if (!socket.userId) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        if (!conversationId || !messageId) {
          callback?.({ success: false, error: 'conversationId and messageId required' });
          return;
        }

        // Verify participant
        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          callback?.({ success: false, error: 'Not a participant in this conversation' });
          return;
        }

        const msg = messageRepo.findById(messageId);
        if (!msg || msg.conversationId !== conversationId) {
          callback?.({ success: false, error: 'Message not found in conversation' });
          return;
        }

        if (msg.senderId !== socket.userId) {
          const marked = messageRepo.markDelivered(messageId, socket.userId);
          if (marked) {
            const now = new Date().toISOString();
            io.to(`user:${msg.senderId}`).emit(SOCKET_EVENTS.SERVER_MESSAGE_STATUS, {
              conversationId,
              messageId,
              status: 'delivered',
              updatedAt: now,
            });
          }
        }

        callback?.({ success: true });
      }
    );

    // ─── Read Acknowledgement (Phase 5) ───────────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_MARK_READ,
      (payload: { conversationId: string; messageId: string }, callback?: (res: ApiResponse<{ readCount: number }>) => void) => {
        const { conversationId, messageId } = payload || {};

        if (!socket.userId) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        if (!conversationId || !messageId) {
          callback?.({ success: false, error: 'conversationId and messageId required' });
          return;
        }

        // Verify participant
        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          callback?.({ success: false, error: 'Not a participant in this conversation' });
          return;
        }

        const targetMsg = messageRepo.findById(messageId);
        if (!targetMsg || targetMsg.conversationId !== conversationId) {
          callback?.({ success: false, error: 'Message not found in conversation' });
          return;
        }

        const newlyReadIds = messageRepo.markReadUpTo(conversationId, socket.userId, messageId);

        if (newlyReadIds.length > 0) {
          const now = new Date().toISOString();
          const peer = participants.find((p) => p.userId !== socket.userId);
          if (peer) {
            for (const readId of newlyReadIds) {
              io.to(`user:${peer.userId}`).emit(SOCKET_EVENTS.SERVER_MESSAGE_STATUS, {
                conversationId,
                messageId: readId,
                status: 'read',
                updatedAt: now,
              });
            }
          }

          // Emit unread update for the reader
          const unreadCount = messageRepo.getUnreadCount(conversationId, socket.userId);
          io.to(`user:${socket.userId}`).emit(SOCKET_EVENTS.SERVER_UNREAD_UPDATE, {
            conversationId,
            unreadCount,
          });
        }

        callback?.({ success: true, data: { readCount: newlyReadIds.length } });
      }
    );

    // ─── Send Message ───────────────────────────────────────────────────
    socket.on(
      SOCKET_EVENTS.CLIENT_SEND_MESSAGE,
      (
        payload: { conversationId: string; content: string },
        callback?: (res: ApiResponse<Message>) => void
      ) => {
        const { conversationId, content } = payload || {};

        if (!socket.userId) {
          const err = 'Authentication required to send messages.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
          const err = 'Message content cannot be empty.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        if (content.length > MAX_MESSAGE_LENGTH) {
          const err = `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`;
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        if (!conversationId || typeof conversationId !== 'string') {
          const err = 'Conversation ID is required.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        const convo = convoRepo.findById(conversationId);
        if (!convo) {
          const err = 'Conversation not found.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        const participants = convoRepo.getParticipants(conversationId);
        const isParticipant = participants.some((p) => p.userId === socket.userId);
        if (!isParticipant) {
          const err = 'You are not a participant in this conversation.';
          socket.emit(SOCKET_EVENTS.SERVER_ERROR, { message: err });
          callback?.({ success: false, error: err });
          return;
        }

        // Clear typing indicator on send
        socket.to(conversationId).emit(SOCKET_EVENTS.SERVER_USER_TYPING, {
          conversationId,
          userId: socket.userId,
          username: socket.username || 'User',
          isTyping: false,
        });

        // 4. Persist to SQLite BEFORE broadcasting
        const messageId = crypto.randomUUID();
        const savedMessage = messageRepo.create({
          id: messageId,
          conversationId,
          senderId: socket.userId,
          content: content.trim(),
        });

        console.log(`[Socket.IO] Message persisted [${savedMessage.id}] in convo [${conversationId}] from [${socket.username}]`);

        // 5. Acknowledge the sender
        callback?.({
          success: true,
          data: savedMessage,
        });

        // 6. Broadcast to all sockets in the conversation room
        io.to(conversationId).emit(SOCKET_EVENTS.SERVER_NEW_MESSAGE, {
          message: savedMessage,
        });

        // 7. Notify recipient's active devices of new unread count
        const peer = participants.find((p) => p.userId !== socket.userId);
        if (peer) {
          const unreadCount = messageRepo.getUnreadCount(conversationId, peer.userId);
          io.to(`user:${peer.userId}`).emit(SOCKET_EVENTS.SERVER_UNREAD_UPDATE, {
            conversationId,
            unreadCount,
          });
        }
      }
    );

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${socket.id} (user: ${socket.username || 'unauthenticated'}, reason: ${reason})`);
      unregisterUserSocket(io, socket);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO gateway has not been initialized yet.');
  }
  return ioInstance;
}
