import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ConversationRepository } from '../models/conversation.repository';
import { UserRepository } from '../models/user.repository';
import { MessageRepository } from '../models/message.repository';

const convoRepo = new ConversationRepository();
const userRepo = new UserRepository();
const messageRepo = new MessageRepository();

export class ConversationController {
  /**
   * Creates or retrieves a 1-to-1 direct conversation between two users.
   * Guarantees strict duplicate prevention in SQLite.
   */
  async createOrGetDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { participantId } = req.body;

      if (!currentUserId || typeof currentUserId !== 'string') {
        res.status(401).json({
          success: false,
          error: 'Current user identity is required.',
        });
        return;
      }

      if (!participantId || typeof participantId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Participant ID is required.',
        });
        return;
      }

      if (currentUserId === participantId) {
        res.status(400).json({
          success: false,
          error: 'Cannot start a personal conversation with yourself.',
        });
        return;
      }

      // Verify both users exist in SQLite
      const currentUser = userRepo.findById(currentUserId);
      const targetUser = userRepo.findById(participantId);

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Invalid current user session.',
        });
        return;
      }

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'Selected user does not exist.',
        });
        return;
      }

      // Check if conversation already exists (duplicate prevention)
      const existingConvo = convoRepo.findDirectConversation(currentUserId, participantId);
      if (existingConvo) {
        const details = convoRepo.getConversationWithDetails(existingConvo.id);
        res.status(200).json({
          success: true,
          data: details,
        });
        return;
      }

      // Create new direct conversation
      const convoId = crypto.randomUUID();
      convoRepo.createDirect(convoId, currentUserId, participantId);
      const details = convoRepo.getConversationWithDetails(convoId);

      res.status(201).json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves all conversations for the authenticated user.
   */
  async getUserConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      if (!currentUserId || typeof currentUserId !== 'string') {
        res.status(401).json({
          success: false,
          error: 'Current user identity is required.',
        });
        return;
      }

      const convos = convoRepo.getUserConversations(currentUserId);

      res.status(200).json({
        success: true,
        data: convos,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves single conversation details.
   */
  async getConversationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ success: false, error: 'Conversation ID is required.' });
        return;
      }

      const convo = convoRepo.getConversationWithDetails(id);
      if (!convo) {
        res.status(404).json({ success: false, error: 'Conversation not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: convo,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves message history for a conversation.
   * Enforces participant authorization check.
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const rawId = req.params.id;
      const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!currentUserId || typeof currentUserId !== 'string') {
        res.status(401).json({
          success: false,
          error: 'Current user identity is required.',
        });
        return;
      }

      if (!conversationId || typeof conversationId !== 'string') {
        res.status(400).json({ success: false, error: 'Conversation ID is required.' });
        return;
      }

      const convo = convoRepo.findById(conversationId);
      if (!convo) {
        res.status(404).json({ success: false, error: 'Conversation not found.' });
        return;
      }

      const participants = convoRepo.getParticipants(conversationId);
      const isParticipant = participants.some((p) => p.userId === currentUserId);
      if (!isParticipant) {
        res.status(403).json({
          success: false,
          error: 'You are not a participant in this conversation.',
        });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const messages = messageRepo.getConversationMessages(conversationId, limit);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const conversationController = new ConversationController();
