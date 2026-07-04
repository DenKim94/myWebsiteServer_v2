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

  app.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });
}

bootstrap();
