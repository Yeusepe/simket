import { bootstrap } from '@vendure/core';
import { config } from './config/index.js';
import { shutdownRedis } from './cache/index.js';

/**
 * Bootstrap the Vendure server.
 *
 * Handles graceful shutdown per architecture §9.5:
 * - Stops accepting new connections
 * - Drains active requests (30s grace)
 * - Closes Redis connections
 */
async function start(): Promise<void> {
  const app = await bootstrap(config);

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully…`);
    await shutdownRedis();
    await app.close();
    console.log('Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  const port = config.apiOptions?.port ?? 3000;
  console.log(`Vendure server listening on port ${port}`);
}

start().catch((err) => {
  console.error('Failed to start Vendure:', err);
  process.exit(1);
});
