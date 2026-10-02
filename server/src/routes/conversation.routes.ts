import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller';

export const conversationRouter = Router();

// Create or retrieve 1-to-1 conversation
conversationRouter.post('/', (req, res, next) =>
  conversationController.createOrGetDirect(req, res, next)
);

// Get all conversations for current user
conversationRouter.get('/', (req, res, next) =>
  conversationController.getUserConversations(req, res, next)
);

// Get single conversation details
conversationRouter.get('/:id', (req, res, next) =>
  conversationController.getConversationById(req, res, next)
);

// Get message history for conversation (Phase 3)
conversationRouter.get('/:id/messages', (req, res, next) =>
  conversationController.getMessages(req, res, next)
);
