import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { UserRepository } from '../models/user.repository';

const userRepo = new UserRepository();
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export class UserController {
  /**
   * Registers a new user with a unique username.
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Please enter a username.',
        });
        return;
      }

      const trimmed = username.trim();

      if (trimmed.length < 3 || trimmed.length > 20) {
        res.status(400).json({
          success: false,
          error: 'Username must be between 3 and 20 characters.',
        });
        return;
      }

      if (!USERNAME_REGEX.test(trimmed)) {
        res.status(400).json({
          success: false,
          error: 'Use only letters, numbers, and underscores (no spaces or special characters).',
        });
        return;
      }

      // Check case-insensitive uniqueness
      const existingUser = userRepo.findByUsername(trimmed);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'That username is already taken.',
        });
        return;
      }

      // Create new user record
      const id = crypto.randomUUID();
      const user = userRepo.create(id, trimmed);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves user by ID (used for returning user verification).
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ success: false, error: 'User ID is required.' });
        return;
      }

      const user = userRepo.findById(id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Searches users by partial username, case-insensitively, excluding current user.
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query.q;
      if (!q || typeof q !== 'string' || !q.trim()) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const currentUserId = (req.headers['x-user-id'] as string) || undefined;
      const users = userRepo.searchByUsername(q.trim(), currentUserId);

      const safeUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
      }));

      res.status(200).json({
        success: true,
        data: safeUsers,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
