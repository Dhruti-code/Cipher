import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  clientUrl: string;
  databasePath: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/chat.db'),
};
