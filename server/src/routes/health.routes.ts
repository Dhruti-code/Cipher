import { Router } from 'express';
import { getDb } from '../db/database';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as alive').get() as { alive?: number };
    if (result && result.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `error: ${(err as Error).message}`;
  }

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});
