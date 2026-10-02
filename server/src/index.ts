import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDatabase, closeDb } from './db/database';
import { initSocketGateway } from './sockets';
import { apiRouter } from './routes';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';

async function bootstrap() {
  console.log(`[Server] Starting in ${config.nodeEnv} mode...`);

  // 1. Initialize SQLite Database & Schema
  try {
    initDatabase();
    console.log(`[Database] SQLite connected at ${config.databasePath}`);
  } catch (err) {
    console.error('[Database] Failed to initialize SQLite database:', err);
    process.exit(1);
  }

  // 2. Setup Express Application
  const app = express();

  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(requestLogger);

  // Mount API router
  app.use('/api', apiRouter);

  // 404 handler for undefined API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Global error handler
  app.use(errorHandler);

  // 3. Setup HTTP Server & Socket.IO Gateway
  const server = http.createServer(app);
  initSocketGateway(server, { corsOrigin: config.clientUrl });

  // 4. Start Server Listening
  server.listen(config.port, () => {
    console.log(`[Server] HTTP and WebSocket listening on http://localhost:${config.port}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => {
      closeDb();
      console.log('[Server] Closed connections. Exited cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
