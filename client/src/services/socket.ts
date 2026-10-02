import { io, Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  Message,
  ApiResponse,
  SocketTypingPayload,
  SocketPresencePayload,
  SocketStatusPayload,
  SocketUnreadUpdatePayload,
} from 'chat-app-shared';

function resolveSocketUrl(): string {
  const socketEnv = import.meta.env.VITE_SOCKET_URL;
  if (socketEnv) {
    return socketEnv.trim().replace(/\/+$/, '');
  }
  const apiEnv = import.meta.env.VITE_API_URL;
  if (apiEnv) {
    return apiEnv.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  return window.location.origin;
}

export type SocketConnectionState = 'connected' | 'connecting' | 'disconnected';

class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;
  private connectionState: SocketConnectionState = 'disconnected';
  private stateListeners: Set<(state: SocketConnectionState) => void> = new Set();
  private messageListeners: Set<(message: Message) => void> = new Set();
  private typingListeners: Set<(payload: SocketTypingPayload) => void> = new Set();
  private presenceListeners: Set<(payload: SocketPresencePayload) => void> = new Set();
  private statusListeners: Set<(payload: SocketStatusPayload) => void> = new Set();
  private unreadListeners: Set<(payload: SocketUnreadUpdatePayload) => void> = new Set();
  private activeRoom: string | null = null;

  connect(userId: string): Socket {
    if (this.socket && this.currentUserId === userId && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentUserId = userId;
    this.setConnectionState('connecting');

    const socketUrl = resolveSocketUrl();

    this.socket = io(socketUrl, {
      auth: { userId },
      extraHeaders: {
        'x-user-id': userId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected:', this.socket?.id);
      this.setConnectionState('connected');

      // Re-join active room if reconnecting
      if (this.activeRoom) {
        this.joinConversation(this.activeRoom);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
      this.setConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[SocketService] Connection error:', error.message);
      this.setConnectionState('disconnected');
    });

    this.socket.on(SOCKET_EVENTS.SERVER_NEW_MESSAGE, (payload: { message: Message }) => {
      if (payload?.message) {
        this.messageListeners.forEach((listener) => listener(payload.message));
      }
    });

    this.socket.on(SOCKET_EVENTS.SERVER_USER_TYPING, (payload: SocketTypingPayload) => {
      if (payload) {
        this.typingListeners.forEach((listener) => listener(payload));
      }
    });

    this.socket.on(SOCKET_EVENTS.SERVER_PRESENCE_UPDATE, (payload: SocketPresencePayload) => {
      if (payload) {
        this.presenceListeners.forEach((listener) => listener(payload));
      }
    });

    this.socket.on(SOCKET_EVENTS.SERVER_MESSAGE_STATUS, (payload: SocketStatusPayload) => {
      if (payload) {
        this.statusListeners.forEach((listener) => listener(payload));
      }
    });

    this.socket.on(SOCKET_EVENTS.SERVER_UNREAD_UPDATE, (payload: SocketUnreadUpdatePayload) => {
      if (payload) {
        this.unreadListeners.forEach((listener) => listener(payload));
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeRoom = null;
    this.setConnectionState('disconnected');
  }

  joinConversation(conversationId: string): Promise<boolean> {
    this.activeRoom = conversationId;
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      this.socket.emit(
        SOCKET_EVENTS.CLIENT_JOIN_CONVERSATION,
        { conversationId },
        (res?: ApiResponse<{ conversationId: string }>) => {
          if (res?.success) {
            resolve(true);
          } else {
            console.warn('[SocketService] Failed to join conversation:', res?.error);
            resolve(false);
          }
        }
      );
    });
  }

  leaveConversation(conversationId: string): void {
    if (this.activeRoom === conversationId) {
      this.activeRoom = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_LEAVE_CONVERSATION, { conversationId });
    }
  }

  sendMessage(conversationId: string, content: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error("Couldn't send message: Connection lost. Reconnecting..."));
        return;
      }

      this.socket.emit(
        SOCKET_EVENTS.CLIENT_SEND_MESSAGE,
        { conversationId, content },
        (response?: ApiResponse<Message>) => {
          if (response?.success && response.data) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Message couldn't be sent. Please try again."));
          }
        }
      );
    });
  }

  startTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_TYPING_START, { conversationId });
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_TYPING_STOP, { conversationId });
    }
  }

  markDelivered(conversationId: string, messageId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_MARK_DELIVERED, { conversationId, messageId });
    }
  }

  markRead(conversationId: string, messageId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.CLIENT_MARK_READ, { conversationId, messageId });
    }
  }

  getPresence(targetUserId: string): Promise<'online' | 'offline'> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve('offline');
        return;
      }

      this.socket.emit(
        SOCKET_EVENTS.CLIENT_GET_PRESENCE,
        { targetUserId },
        (response?: ApiResponse<{ status: 'online' | 'offline' }>) => {
          if (response?.success && response.data?.status) {
            resolve(response.data.status);
          } else {
            resolve('offline');
          }
        }
      );
    });
  }

  onNewMessage(listener: (message: Message) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  onUserTyping(listener: (payload: SocketTypingPayload) => void): () => void {
    this.typingListeners.add(listener);
    return () => {
      this.typingListeners.delete(listener);
    };
  }

  onPresenceUpdate(listener: (payload: SocketPresencePayload) => void): () => void {
    this.presenceListeners.add(listener);
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  onMessageStatus(listener: (payload: SocketStatusPayload) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onUnreadUpdate(listener: (payload: SocketUnreadUpdatePayload) => void): () => void {
    this.unreadListeners.add(listener);
    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  onConnectionChange(listener: (state: SocketConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: SocketConnectionState): void {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}

export const socketService = new SocketService();
