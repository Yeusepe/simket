/**
 * Purpose: Verify CrowdSec NestJS guard request extraction and deny/allow behaviour.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.nestjs.com/guards
 * Tests:
 *   - packages/vendure-server/src/security/crowdsec.guard.test.ts
 */
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CrowdSecGuard } from './crowdsec.guard.js';

function createHttpExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({} as never),
    switchToWs: () => ({} as never),
    getArgByIndex: (index: number) => (index === 0 ? request : undefined),
    getArgs: () => [request],
    getClass: () => CrowdSecGuard,
    getHandler: () => CrowdSecGuard.prototype.canActivate,
    getType: () => 'http',
  } as ExecutionContext;
}

function createGraphqlExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => undefined,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({} as never),
    switchToWs: () => ({} as never),
    getArgByIndex: (index: number) => (index === 2 ? { req: request } : undefined),
    getArgs: () => [{}, {}, { req: request }],
    getClass: () => CrowdSecGuard,
    getHandler: () => CrowdSecGuard.prototype.canActivate,
    getType: () => 'graphql',
  } as ExecutionContext;
}

describe('CrowdSecGuard', () => {
  it('allows requests that CrowdSec permits', async () => {
    const bouncer = { checkIp: vi.fn().mockResolvedValue('allow') };
    const guard = new CrowdSecGuard(bouncer);

    await expect(
      guard.canActivate(createHttpExecutionContext({
        ip: '203.0.113.10',
        headers: {},
      })),
    ).resolves.toBe(true);

    expect(bouncer.checkIp).toHaveBeenCalledWith('203.0.113.10');
  });

  it('prefers X-Forwarded-For when resolving the client IP', async () => {
    const bouncer = { checkIp: vi.fn().mockResolvedValue('allow') };
    const guard = new CrowdSecGuard(bouncer);

    await guard.canActivate(createHttpExecutionContext({
      ip: '10.0.0.5',
      headers: {
        'x-forwarded-for': '198.51.100.3, 10.0.0.5',
      },
    }));

    expect(bouncer.checkIp).toHaveBeenCalledWith('198.51.100.3');
  });

  it('blocks denied requests with a ForbiddenException', async () => {
    const guard = new CrowdSecGuard({
      checkIp: vi.fn().mockResolvedValue('deny'),
    });

    await expect(
      guard.canActivate(createHttpExecutionContext({
        ip: '203.0.113.20',
        headers: {},
      })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks captcha remediations with a ForbiddenException', async () => {
    const guard = new CrowdSecGuard({
      checkIp: vi.fn().mockResolvedValue('captcha'),
    });

    await expect(
      guard.canActivate(createHttpExecutionContext({
        ip: '203.0.113.21',
        headers: {},
      })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('extracts requests from GraphQL contexts when no HTTP request is available', async () => {
    const bouncer = { checkIp: vi.fn().mockResolvedValue('allow') };
    const guard = new CrowdSecGuard(bouncer);

    await expect(
      guard.canActivate(createGraphqlExecutionContext({
        headers: {
          'x-real-ip': '198.51.100.4',
        },
      })),
    ).resolves.toBe(true);

    expect(bouncer.checkIp).toHaveBeenCalledWith('198.51.100.4');
  });
});
