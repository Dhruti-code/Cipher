import { User, ApiResponse, ConversationWithDetails, Message } from 'chat-app-shared';

export interface HealthCheckResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
}

export type UserSearchResult = { id: string; username: string };

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      if ((err as Error).name === 'TypeError' || !(err as Error).message) {
        throw new Error("Couldn't connect to the server. Please try again.");
      }
      throw err;
    }
  }

  async post<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      if ((err as Error).name === 'TypeError' || !(err as Error).message) {
        throw new Error("Couldn't connect to the server. Please try again.");
      }
      throw err;
    }
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    return this.get<HealthCheckResponse>('/health');
  }

  // ─── Phase 1 ──────────────────────────────────────────────────────────────

  async registerUser(username: string): Promise<User> {
    const res = await this.post<ApiResponse<User>>('/users', { username });
    if (!res.data) throw new Error(res.error || 'Failed to register user.');
    return res.data;
  }

  async getUserById(id: string): Promise<User> {
    const res = await this.get<ApiResponse<User>>(`/users/${encodeURIComponent(id)}`);
    if (!res.data) throw new Error(res.error || 'User not found.');
    return res.data;
  }

  // ─── Phase 2 ──────────────────────────────────────────────────────────────

  /**
   * Searches registered users by partial username, excluding the current user.
   */
  async searchUsers(query: string, currentUserId: string): Promise<UserSearchResult[]> {
    const res = await this.get<ApiResponse<UserSearchResult[]>>(
      `/users/search?q=${encodeURIComponent(query)}`,
      { 'x-user-id': currentUserId }
    );
    return res.data ?? [];
  }

  /**
   * Creates or retrieves a 1-to-1 direct conversation.
   */
  async createOrGetConversation(
    participantId: string,
    currentUserId: string
  ): Promise<ConversationWithDetails> {
    const res = await this.post<ApiResponse<ConversationWithDetails>>(
      '/conversations',
      { participantId },
      { 'x-user-id': currentUserId }
    );
    if (!res.data) throw new Error(res.error || 'Couldn\'t start this conversation. Please try again.');
    return res.data;
  }

  /**
   * Retrieves all conversations for the current user (Recent Chats).
   */
  async getConversations(currentUserId: string): Promise<ConversationWithDetails[]> {
    const res = await this.get<ApiResponse<ConversationWithDetails[]>>(
      '/conversations',
      { 'x-user-id': currentUserId }
    );
    return res.data ?? [];
  }

  // ─── Phase 3 ──────────────────────────────────────────────────────────────

  /**
   * Retrieves chronological message history for a conversation.
   */
  async getConversationMessages(
    conversationId: string,
    currentUserId: string,
    limit: number = 100
  ): Promise<Message[]> {
    const res = await this.get<ApiResponse<Message[]>>(
      `/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`,
      { 'x-user-id': currentUserId }
    );
    return res.data ?? [];
  }
}

export const api = new ApiClient();
