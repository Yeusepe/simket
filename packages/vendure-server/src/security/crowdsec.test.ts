import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import { CrowdSecBouncer, crowdSecMiddleware } from './crowdsec.js';
import { BrokenCircuitError } from '../resilience/resilience.js';

/* ---------- helpers ---------- */

/**
 * Proper CrowdSec LAPI decision object format.
 * The @crowdsec/nodejs-bouncer SDK requires these fields.
 * Ref: https://docs.crowdsec.net/docs/cscli/cscli_decisions_list/
 */
interface LapiDecision {
  id: number;
  origin: string;
  type: string;
  scope: string;
  value: string;
  duration: string;
  scenario: string;
}

/** Minimal fake LAPI server with proper CrowdSec response format. */
function createFakeLapi(decisions: Record<string, LapiDecision[]>): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost`);

    // SDK sends HEAD /v1/decisions to check connectivity
    if (req.method === 'HEAD') {
      res.writeHead(200);
      res.end();
      return;
    }

    const ip = url.searchParams.get('ip');
    res.setHeader('Content-Type', 'application/json');

    if (!ip || !decisions[ip]) {
      // CrowdSec returns null (no decision) for clean IPs
      res.writeHead(200);
      res.end('null');
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(decisions[ip]));
  });
}

function listenOnRandomPort(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(addr.port);
      }
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

/** Minimal Express-compatible request/response stubs for middleware tests. */
function createMockReq(
  ip: string,
  headers: Record<string, string> = {},
): {
  ip: string;
  headers: Record<string, string>;
} {
  return { ip, headers };
}

function createMockRes(): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
} {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    status(code: number) {
      res.statusCode = code;
      return {
        json(body: unknown) {
          res.body = JSON.stringify(body);
        },
      };
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
  };
  return res;
}

/** Helper to create a proper LAPI decision for the SDK. */
function makeBanDecision(ip: string): LapiDecision {
  return { id: 1, origin: 'cscli', type: 'ban', scope: 'ip', value: ip, duration: '4h', scenario: 'manual' };
}

function makeCaptchaDecision(ip: string): LapiDecision {
  return { id: 2, origin: 'cscli', type: 'captcha', scope: 'ip', value: ip, duration: '4h', scenario: 'manual' };
}

/* ---------- CrowdSecBouncer tests ---------- */

describe('CrowdSecBouncer', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = createFakeLapi({
      '10.0.0.1': [makeBanDecision('10.0.0.1')],
      '10.0.0.2': [makeCaptchaDecision('10.0.0.2')],
      // 10.0.0.3 is clean — no entry
    });
    port = await listenOnRandomPort(server);
  });

  afterAll(async () => {
    await closeServer(server);
  });

  it('should return "allow" for a clean IP', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const decision = await bouncer.checkIp('10.0.0.3');
    expect(decision).toBe('allow');
  });

  it('should return "deny" for a banned IP', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const decision = await bouncer.checkIp('10.0.0.1');
    expect(decision).toBe('deny');
  });

  it('should return "captcha" for a captcha-flagged IP', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const decision = await bouncer.checkIp('10.0.0.2');
    expect(decision).toBe('captcha');
  });

  it('should fail-closed (deny) when LAPI is unreachable and fallbackMode is deny-all', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:1', // unreachable port
      apiKey: 'test-key',
      fallbackMode: 'deny-all',
    });
    const decision = await bouncer.checkIp('99.99.99.99');
    expect(decision).toBe('deny');
  });

  it('should fall back to rate-limit mode when LAPI is unreachable', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:1', // unreachable port
      apiKey: 'test-key',
      fallbackMode: 'rate-limit',
    });
    // First calls within rate limit should be allowed
    const decision = await bouncer.checkIp('88.88.88.88');
    expect(decision).toBe('allow');
  });

  it('should default to deny-all fallbackMode', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:1',
      apiKey: 'test-key',
      // no fallbackMode specified
    });
    const decision = await bouncer.checkIp('77.77.77.77');
    expect(decision).toBe('deny');
  });

  it('should deny immediately when the CrowdSec circuit breaker is open', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
      fallbackMode: 'rate-limit',
      policy: {
        execute: async () => {
          throw new BrokenCircuitError();
        },
      },
    });

    await expect(bouncer.checkIp('10.0.0.99')).resolves.toBe('deny');
  });
});

/* ---------- Middleware tests ---------- */

describe('crowdSecMiddleware', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = createFakeLapi({
      '10.0.0.1': [makeBanDecision('10.0.0.1')],
    });
    port = await listenOnRandomPort(server);
  });

  afterAll(async () => {
    await closeServer(server);
  });

  it('should pass through for allowed IPs', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const middleware = crowdSecMiddleware(bouncer);

    const req = createMockReq('10.0.0.3');
    const res = createMockRes();
    let nextCalled = false;

    await middleware(
      req as never,
      res as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(true);
    expect(res.headers['X-CrowdSec-Decision']).toBe('allow');
  });

  it('should return 403 for denied IPs', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const middleware = crowdSecMiddleware(bouncer);

    const req = createMockReq('10.0.0.1');
    const res = createMockRes();
    let nextCalled = false;

    await middleware(
      req as never,
      res as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.headers['X-CrowdSec-Decision']).toBe('deny');
  });

  it('should extract IP from X-Forwarded-For header first', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const middleware = crowdSecMiddleware(bouncer);

    // req.ip says clean, but X-Forwarded-For says banned
    const req = createMockReq('10.0.0.3', { 'x-forwarded-for': '10.0.0.1, 172.16.0.1' });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(
      req as never,
      res as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('should extract IP from X-Real-IP header as second priority', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const middleware = crowdSecMiddleware(bouncer);

    const req = createMockReq('10.0.0.3', { 'x-real-ip': '10.0.0.1' });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(
      req as never,
      res as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('should set X-CrowdSec-Decision response header', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-key',
    });
    const middleware = crowdSecMiddleware(bouncer);

    const req = createMockReq('10.0.0.3');
    const res = createMockRes();

    await middleware(req as never, res as never, (() => {}) as never);

    expect(res.headers['X-CrowdSec-Decision']).toBeDefined();
  });
});
