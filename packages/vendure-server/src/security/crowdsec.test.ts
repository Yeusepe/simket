import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as http from 'node:http';
import { CrowdSecBouncer, crowdSecMiddleware } from './crowdsec.js';

/* ---------- helpers ---------- */

/** Minimal fake LAPI server that returns CrowdSec-style decisions. */
function createFakeLapi(decisions: Record<string, Array<{ type: string }>>): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost`);
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
  return new Promise((resolve) => server.close(() => resolve()));
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

/* ---------- CrowdSecBouncer tests ---------- */

describe('CrowdSecBouncer', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = createFakeLapi({
      '10.0.0.1': [{ type: 'ban' }],
      '10.0.0.2': [{ type: 'captcha' }],
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

  it('should use LRU cache on repeated checks for the same IP', async () => {
    let requestCount = 0;
    const countingServer = http.createServer((_req, res) => {
      requestCount++;
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end('null');
    });
    const countingPort = await listenOnRandomPort(countingServer);

    try {
      const bouncer = new CrowdSecBouncer({
        lapiUrl: `http://127.0.0.1:${countingPort}`,
        apiKey: 'test-key',
      });

      await bouncer.checkIp('192.168.1.1');
      await bouncer.checkIp('192.168.1.1');
      await bouncer.checkIp('192.168.1.1');

      // Only the first call should hit the LAPI
      expect(requestCount).toBe(1);
    } finally {
      await closeServer(countingServer);
    }
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
});

/* ---------- Middleware tests ---------- */

describe('crowdSecMiddleware', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = createFakeLapi({
      '10.0.0.1': [{ type: 'ban' }],
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
