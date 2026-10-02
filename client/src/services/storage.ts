/**
 * Local Storage Persistence for User Identity
 *
 * Persists the current user's safe public identity (userId, username).
 * No secrets or passwords exist in this application.
 */

const STORAGE_KEY = 'chat_app_user';

export interface StoredUserIdentity {
  userId: string;
  username: string;
}

export const storage = {
  saveUser(user: { id: string; username: string }): void {
    try {
      const data: StoredUserIdentity = {
        userId: user.id,
        username: user.username,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save user identity to localStorage:', e);
    }
  },

  getStoredUser(): StoredUserIdentity | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.userId === 'string' && typeof parsed.username === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearStoredUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear user identity from localStorage:', e);
    }
  },
};
