import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
// Eagerly resolve the data directory / preload the dataset at startup.
import { getPortfolio } from './data/dataStore';

/** Bootstraps the HTTP server. */
function bootstrap(): void {
  const app = createApp();

  // Warm the in-memory cache and surface data problems early.
  try {
    getPortfolio();
  } catch (error) {
    logger.error('Failed to load portfolio data at startup.', error);
  }

  const server = app.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });

  // Handle listen errors gracefully instead of crashing with an unhandled
  // 'error' event (most commonly: the port is already in use).
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${env.port} is already in use. Stop the other process (e.g. a second server instance) ` +
          `or set a different PORT in server/.env, then restart.`,
      );
    } else {
      logger.error('HTTP server error.', error);
    }
    process.exit(1);
  });
}

bootstrap();
