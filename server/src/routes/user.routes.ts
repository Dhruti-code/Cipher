import { Router } from 'express';
import { userController } from '../controllers/user.controller';

export const userRouter = Router();

// Create new user (Phase 1)
userRouter.post('/', (req, res, next) => userController.createUser(req, res, next));

// Search users by username (Phase 2)
userRouter.get('/search', (req, res, next) => userController.searchUsers(req, res, next));

// Verify returning user by ID (Phase 1)
userRouter.get('/:id', (req, res, next) => userController.getUserById(req, res, next));
