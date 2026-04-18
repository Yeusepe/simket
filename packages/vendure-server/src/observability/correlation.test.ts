import { describe, it, expect, vi, beforeEach } from 'vitest';
import { correlationMiddleware, createLogger, getTraceId, CORRELATION_HEADER } from './correlation.js';

function createMockReq(headers: Record<string, string | undefined> = {}): {
  headers: Record<string, string | undefined>;
} {
  return { headers };
}

function createMockRes(): {
  setHeader: ReturnType<typeof vi.fn>;
  headers: Record<string, string>;
} {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };
}

describe('Correlation Middleware', () => {
  it('should generate a correlation ID when none provided', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    correlationMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_HEADER, expect.any(String));
    const id = res.headers[CORRELATION_HEADER];
    expect(id).toBeDefined();
    expect(id!.length).toBeGreaterThan(0);
  });

  it('should reuse existing correlation ID from request header', () => {
    const existingId = 'abc-123-def';
    const req = createMockReq({ [CORRELATION_HEADER]: existingId });
    const res = createMockRes();
    const next = vi.fn();

    correlationMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_HEADER, existingId);
  });

  it('should generate a new ID when header is empty string', () => {
    const req = createMockReq({ [CORRELATION_HEADER]: '' });
    const res = createMockRes();
    const next = vi.fn();

    correlationMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const id = res.headers[CORRELATION_HEADER];
    expect(id).toBeDefined();
    expect(id!.length).toBeGreaterThan(0);
    expect(id).not.toBe('');
  });

  it('should attach correlationId to the request object', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    correlationMiddleware(req, res, next);

    expect((req as Record<string, unknown>)['correlationId']).toBeDefined();
  });
});

describe('Structured Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a logger with info, warn, error methods', () => {
    const logger = createLogger('test-service');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should output JSON with required fields on info', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = createLogger('test-service');
    logger.info('hello world');

    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed['level']).toBe('info');
    expect(parsed['message']).toBe('hello world');
    expect(parsed['service']).toBe('test-service');
    expect(parsed['timestamp']).toBeDefined();
    expect(typeof parsed['timestamp']).toBe('string');
  });

  it('should output JSON on warn', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = createLogger('test-service');
    logger.warn('something is off', { detail: 'check config' });

    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed['level']).toBe('warn');
    expect(parsed['message']).toBe('something is off');
    expect(parsed['detail']).toBe('check config');
  });

  it('should output to stderr on error', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const logger = createLogger('test-service');
    logger.error('something broke');

    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed['level']).toBe('error');
    expect(parsed['message']).toBe('something broke');
  });

  it('should include extra data in log entries', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = createLogger('test-service');
    logger.info('with data', { userId: '123', action: 'login' });

    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed['userId']).toBe('123');
    expect(parsed['action']).toBe('login');
  });

  it('should produce valid ISO timestamp', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = createLogger('ts-test');
    logger.info('time check');

    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const ts = new Date(parsed['timestamp'] as string);

    expect(ts.getTime()).not.toBeNaN();
  });

  it('should include traceId field in log entries (undefined when no span active)', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = createLogger('trace-test');
    logger.info('with trace');

    const output = writeSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    // traceId is undefined when no OTel span is active, JSON.stringify omits it
    expect(parsed['traceId']).toBeUndefined();
  });
});

describe('getTraceId', () => {
  it('should return undefined when no OTel span is active', () => {
    expect(getTraceId()).toBeUndefined();
  });
});
