import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrokenCircuitError } from '../resilience/resilience.js';

const getIpRemediationMock = vi.fn();

vi.mock('@crowdsec/nodejs-bouncer', () => ({
  CrowdSecBouncer: class MockCrowdSecBouncerSDK {
    constructor(_options: unknown) {}

    getIpRemediation(ip: string) {
      return getIpRemediationMock(ip);
    }
  },
}));

import { CrowdSecBouncer, crowdSecMiddleware } from './crowdsec.js';

const passthroughPolicy = {
  execute<T>(fn: () => Promise<T>) {
    return fn();
  },
};

/* ---------- helpers ---------- */

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

describe('CrowdSecBouncer', () => {
  beforeEach(() => {
    getIpRemediationMock.mockReset();
  });

  it('should return "allow" for a clean IP', async () => {
    getIpRemediationMock.mockResolvedValue({ remediation: 'bypass' });

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('10.0.0.3')).resolves.toBe('allow');
    expect(getIpRemediationMock).toHaveBeenCalledWith('10.0.0.3');
  });

  it('should return "deny" for a banned IP', async () => {
    getIpRemediationMock.mockResolvedValue({ remediation: 'ban' });

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('10.0.0.1')).resolves.toBe('deny');
  });

  it('should return "captcha" for a captcha-flagged IP', async () => {
    getIpRemediationMock.mockResolvedValue({ remediation: 'captcha' });

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('10.0.0.2')).resolves.toBe('captcha');
  });

  it('should fail-closed (deny) when LAPI is unreachable and fallbackMode is deny-all', async () => {
    getIpRemediationMock.mockRejectedValue(new Error('LAPI unreachable'));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      fallbackMode: 'deny-all',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('99.99.99.99')).resolves.toBe('deny');
  });

  it('should fall back to rate-limit mode when LAPI is unreachable', async () => {
    getIpRemediationMock.mockRejectedValue(new Error('LAPI unreachable'));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      fallbackMode: 'rate-limit',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('88.88.88.88')).resolves.toBe('allow');
  });

  it('should default to deny-all fallbackMode', async () => {
    getIpRemediationMock.mockRejectedValue(new Error('LAPI unreachable'));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });

    await expect(bouncer.checkIp('77.77.77.77')).resolves.toBe('deny');
  });

  it('should deny immediately when the CrowdSec circuit breaker is open', async () => {
    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
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

describe('crowdSecMiddleware', () => {
  beforeEach(() => {
    getIpRemediationMock.mockReset();
  });

  it('should pass through for allowed IPs', async () => {
    getIpRemediationMock.mockImplementation(async (ip: string) => ({
      remediation: ip === '10.0.0.1' ? 'ban' : 'bypass',
    }));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
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
    getIpRemediationMock.mockResolvedValue({ remediation: 'ban' });

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
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
    getIpRemediationMock.mockImplementation(async (ip: string) => ({
      remediation: ip === '10.0.0.1' ? 'ban' : 'bypass',
    }));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });
    const middleware = crowdSecMiddleware(bouncer);

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
    getIpRemediationMock.mockImplementation(async (ip: string) => ({
      remediation: ip === '10.0.0.1' ? 'ban' : 'bypass',
    }));

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
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
    getIpRemediationMock.mockResolvedValue({ remediation: 'bypass' });

    const bouncer = new CrowdSecBouncer({
      lapiUrl: 'http://127.0.0.1:8080',
      apiKey: 'test-key',
      policy: passthroughPolicy,
    });
    const middleware = crowdSecMiddleware(bouncer);

    const req = createMockReq('10.0.0.3');
    const res = createMockRes();

    await middleware(req as never, res as never, (() => {}) as never);

    expect(res.headers['X-CrowdSec-Decision']).toBeDefined();
  });
});
