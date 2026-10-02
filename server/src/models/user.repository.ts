import { User } from 'chat-app-shared';
import { getDb } from '../db/database';

export interface IUserRepository {
  findById(id: string): User | null;
  findByUsername(username: string): User | null;
  searchByUsername(query: string, excludeUserId?: string): User[];
  create(id: string, username: string): User;
  updateLastSeen(id: string): void;
}

export class UserRepository implements IUserRepository {
  findById(id: string): User | null {
    const db = getDb();
    const query = db.prepare('SELECT id, username, created_at as createdAt, last_seen_at as lastSeenAt FROM users WHERE id = ?');
    const row = query.get(id) as unknown as (User | undefined);
    return row || null;
  }

  findByUsername(username: string): User | null {
    const db = getDb();
    const query = db.prepare('SELECT id, username, created_at as createdAt, last_seen_at as lastSeenAt FROM users WHERE username = ? COLLATE NOCASE');
    const row = query.get(username) as unknown as (User | undefined);
    return row || null;
  }

  searchByUsername(query: string, excludeUserId?: string): User[] {
    const db = getDb();
    if (excludeUserId) {
      const stmt = db.prepare(
        'SELECT id, username, created_at as createdAt, last_seen_at as lastSeenAt FROM users WHERE username LIKE ? AND id != ? ORDER BY username ASC LIMIT 20'
      );
      return stmt.all(`%${query}%`, excludeUserId) as unknown as User[];
    }
    const stmt = db.prepare(
      'SELECT id, username, created_at as createdAt, last_seen_at as lastSeenAt FROM users WHERE username LIKE ? ORDER BY username ASC LIMIT 20'
    );
    return stmt.all(`%${query}%`) as unknown as User[];
  }

  create(id: string, username: string): User {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO users (id, username, created_at, last_seen_at) VALUES (?, ?, ?, ?)');
    stmt.run(id, username.trim(), now, now);
    return {
      id,
      username: username.trim(),
      createdAt: now,
      lastSeenAt: now,
    };
  }

  updateLastSeen(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?');
    stmt.run(now, id);
  }
}
