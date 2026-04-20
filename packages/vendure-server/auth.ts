/**
 * Purpose: Better Auth CLI entrypoint for migrations and schema generation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://better-auth.com/docs/plugins/jwt
 */
export { auth } from './src/auth/server.ts';
