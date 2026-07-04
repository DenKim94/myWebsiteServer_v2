import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { apiRouter } from './routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

/**
 * Builds and configures the Express application (middleware + routes).
 * Kept separate from the server bootstrap so it can be imported in tests.
 * @returns The configured Express instance.
 */
export function createApp(): Express {
  const app = express();

  // Security headers. `crossOriginResourcePolicy` is relaxed so the client
  // (different origin/port in dev) can load images served by this API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ['GET', 'POST'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '64kb' }));

  // Mount the API
  app.use('/api', apiRouter);

  // 404 + error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
