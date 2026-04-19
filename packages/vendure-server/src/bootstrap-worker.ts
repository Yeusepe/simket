/**
 * Purpose: Bootstrap the Vendure worker process.
 *
 * The worker is a separate Node.js process that picks jobs off the
 * BullMQ-backed queue and executes them (search indexing, emails,
 * asset processing, settlements, etc.).  Keeping heavy work off the
 * server process is the same pattern Shopify uses — the request path
 * stays fast while background work scales independently.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 *   - https://docs.vendure.io/reference/typescript-api/worker/bootstrap-worker/
 *   - https://docs.vendure.io/reference/core-plugins/job-queue-plugin/bull-mqjob-queue-plugin/
 * Tests:
 *   - Worker boot is validated by the dev:worker script starting without errors.
 */
import { bootstrapWorker } from '@vendure/core';
import { config } from './config/index.js';
import { shutdownRedis } from './cache/index.js';

async function startWorker(): Promise<void> {
  const worker = await bootstrapWorker(config);
  await worker.startJobQueue();

  console.log('Vendure worker started — processing jobs');

  const shutdown = async (signal: string) => {
    console.log(`Worker received ${signal}. Shutting down gracefully…`);
    await shutdownRedis();
    await worker.app.close();
    console.log('Worker shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startWorker().catch((err) => {
  console.error('Failed to start Vendure worker:', err);
  process.exit(1);
});
