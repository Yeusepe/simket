/**
 * Purpose: Run the standalone Better Auth Express server used by Simket for
 *          local sessions, YUCP creator federation, and JWT issuance.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://better-auth.com/docs/integrations/express
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth, seedBetterAuthDevelopmentUsers } from './auth/server.js';
import { resolveBetterAuthPort, resolveBetterAuthPublicBaseUrl, resolveBetterAuthServerOrigin } from './auth/config.js';

async function start(): Promise<void> {
  const app = express();
  const port = resolveBetterAuthPort();

  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.get('/health', (_request, response) => {
    response.status(200).json({
      ok: true,
      publicUrl: resolveBetterAuthPublicBaseUrl(),
      serverOrigin: resolveBetterAuthServerOrigin(),
    });
  });
  app.use(express.json());

  await seedBetterAuthDevelopmentUsers();

  app.listen(port, () => {
    console.log(`Better Auth server listening on ${resolveBetterAuthServerOrigin()} (public ${resolveBetterAuthPublicBaseUrl()})`);
  });
}

start().catch((error) => {
  console.error('Failed to start Better Auth:', error);
  process.exit(1);
});
