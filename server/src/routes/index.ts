import { Router } from 'express';
import { healthRouter } from './health.routes';

import { userRouter } from './user.routes';
import { conversationRouter } from './conversation.routes';

export const apiRouter = Router();

// Health check endpoint
apiRouter.use('/health', healthRouter);

// User endpoints (Phase 1: Registration and verification, Phase 2: Search)
apiRouter.use('/users', userRouter);

// Conversation endpoints (Phase 2: Direct conversations)
apiRouter.use('/conversations', conversationRouter);
