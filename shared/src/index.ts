/**
 * SHARED DATA CONTRACTS & MODELS
 * Personal Real-Time Chat App
 *
 * Designed for 1-to-1 direct messaging with clean extensibility for future group conversations.
 */

// ----------------------------------------------------
// 1. User Model
// ----------------------------------------------------
export interface User {
  id: string;
  username: string;
  createdAt: string;
  lastSeenAt: string;
  isOnline?: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeenAt: string;
}

// ----------------------------------------------------
// 2. Conversation Model
// ----------------------------------------------------
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadMessageId?: string | null;
}

export interface ConversationWithDetails extends Conversation {
  participants: UserSummary[];
  lastMessage?: Message | null;
  unreadCount: number;
}

// ----------------------------------------------------
// 3. Message Model & States
// ----------------------------------------------------
export type MessageDeliveryState = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  tempId?: string; // Client-side identifier for optimistic updates and retry
  deliveryState?: MessageDeliveryState;
}

export interface MessageStatus {
  id: string;
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  updatedAt: string;
}

// ----------------------------------------------------
// 4. API Request / Response Types
// ----------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterUserRequest {
  username: string;
}

export interface RegisterUserResponse {
  user: User;
  isNewUser: boolean;
}

export interface CheckUsernameResponse {
  available: boolean;
  username: string;
}

export interface StartDirectChatRequest {
  recipientId: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  tempId?: string;
}

// ----------------------------------------------------
// 5. Real-Time Socket Event Contracts (Prepared for Phase 1+)
// ----------------------------------------------------
export const SOCKET_EVENTS = {
  // Client -> Server
  CLIENT_CONNECT_USER: 'client:user_connect',
  CLIENT_JOIN_CONVERSATION: 'client:join_conversation',
  CLIENT_LEAVE_CONVERSATION: 'client:leave_conversation',
  CLIENT_SEND_MESSAGE: 'client:send_message',
  CLIENT_TYPING_START: 'client:typing_start',
  CLIENT_TYPING_STOP: 'client:typing_stop',
  CLIENT_GET_PRESENCE: 'client:get_presence',
  CLIENT_MARK_DELIVERED: 'client:mark_delivered',
  CLIENT_MARK_READ: 'client:mark_read',

  // Server -> Client
  SERVER_USER_ONLINE: 'server:user_online',
  SERVER_USER_OFFLINE: 'server:user_offline',
  SERVER_PRESENCE_UPDATE: 'server:presence_update',
  SERVER_ONLINE_USERS: 'server:online_users',
  SERVER_NEW_MESSAGE: 'server:new_message',
  SERVER_MESSAGE_STATUS: 'server:message_status',
  SERVER_UNREAD_UPDATE: 'server:unread_update',
  SERVER_USER_TYPING: 'server:user_typing',
  SERVER_ERROR: 'server:error',
} as const;

export interface SocketUserPayload {
  userId: string;
}

export interface SocketJoinPayload {
  conversationId: string;
}

export interface SocketSendMessagePayload {
  conversationId: string;
  content: string;
}

export interface SocketMessagePayload {
  message: Message;
}

export interface SocketTypingPayload {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface SocketStatusPayload {
  messageId: string;
  conversationId: string;
  status: 'delivered' | 'read';
  updatedAt: string;
}

export interface SocketPresencePayload {
  userId: string;
  status: 'online' | 'offline';
}

export interface SocketGetPresencePayload {
  targetUserId: string;
}

export interface SocketUnreadUpdatePayload {
  conversationId: string;
  unreadCount: number;
}

export interface SocketMarkDeliveredPayload {
  conversationId: string;
  messageId: string;
}

export interface SocketMarkReadPayload {
  conversationId: string;
  messageId: string;
}
