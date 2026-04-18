/**
 * Purpose: Unit tests for the ClamAV scanning service and pure response helpers.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.clamav.net/manual/Usage/Scanning.html
 *   - https://manpages.debian.org/testing/clamav-daemon/clamd.8.en.html
 *   - https://raw.githubusercontent.com/kylefarris/clamscan/master/README.md
 *   - packages/vendure-server/node_modules/@types/clamscan/index.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/clamav/clamav.service.test.ts
 */
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { QuarantineRecord, ScanResult } from './clamav.types.js';
import {
  ClamavScannerService,
  buildQuarantineRecord,
  parseClamdResponse,
  validateClamavConfig,
} from './clamav.service.js';

const VALID_CONFIG = {
  host: '127.0.0.1',
  port: 3310,
  timeout: 5_000,
  maxFileSize: 1_024,
} as const;

describe('validateClamavConfig', () => {
  it('accepts a complete config', () => {
    expect(validateClamavConfig(VALID_CONFIG)).toEqual(VALID_CONFIG);
  });

  it('rejects missing host values', () => {
    expect(() =>
      validateClamavConfig({
        ...VALID_CONFIG,
        host: '',
      }),
    ).toThrow(/host/i);
  });
});

describe('parseClamdResponse', () => {
  it('parses clean stream responses', () => {
    expect(parseClamdResponse('stream: OK')).toEqual({
      verdict: 'clean',
      threat: undefined,
      error: undefined,
    });
  });

  it('parses infected stream responses', () => {
    expect(parseClamdResponse('stream: Eicar-Test-Signature FOUND')).toEqual({
      verdict: 'infected',
      threat: 'Eicar-Test-Signature',
      error: undefined,
    });
  });
});

describe('buildQuarantineRecord', () => {
  it('builds a quarantine record for infected files', () => {
    const infected: ScanResult = {
      verdict: 'infected',
      filename: 'payload.zip',
      fileSize: 128,
      scannedAt: '2025-01-01T00:00:00.000Z',
      threat: 'Eicar-Test-Signature',
      durationMs: 12,
    };

    const record = buildQuarantineRecord(infected) as QuarantineRecord;

    expect(record.filename).toBe('payload.zip');
    expect(record.threat).toBe('Eicar-Test-Signature');
    expect(record.fileSize).toBe(128);
    expect(record.scannedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(record.quarantineId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns undefined for clean files', () => {
    expect(
      buildQuarantineRecord({
        verdict: 'clean',
        filename: 'hero.png',
        fileSize: 12,
        scannedAt: '2025-01-01T00:00:00.000Z',
        durationMs: 1,
      }),
    ).toBeUndefined();
  });
});

describe('ClamavScannerService', () => {
  function createService(overrides?: {
    ping?: () => Promise<unknown>;
    getVersion?: () => Promise<string>;
    scanStream?: (stream: Readable) => Promise<{
      file: string;
      isInfected: boolean | null;
      viruses: string[];
    }>;
  }) {
    const client = {
      ping: vi.fn(overrides?.ping ?? (async () => ({ ok: true }))),
      getVersion: vi.fn(overrides?.getVersion ?? (async () => 'ClamAV 1.4/test')),
      scanStream: vi.fn(
        overrides?.scanStream ??
          (async () => ({
            file: 'stream',
            isInfected: false,
            viruses: [],
          })),
      ),
    };

    const service = new ClamavScannerService(VALID_CONFIG, {
      clientFactory: vi.fn(async () => client),
      policy: {
        execute: async <T>(fn: () => Promise<T>) => fn(),
      },
    });

    return {
      client,
      service,
    };
  }

  it('returns a clean verdict for safe buffers', async () => {
    const { service } = createService();

    const result = await service.scanBuffer(Buffer.from('safe-content'), 'safe.txt');

    expect(result.verdict).toBe('clean');
    expect(result.filename).toBe('safe.txt');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.scannedAt).toMatch(/Z$/);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('rejects oversized buffers before scanning', async () => {
    const { service, client } = createService();

    const result = await service.scanBuffer(Buffer.alloc(VALID_CONFIG.maxFileSize + 1), 'big.bin');

    expect(result.verdict).toBe('error');
    expect(result.error).toMatch(/max file size/i);
    expect(client.scanStream).not.toHaveBeenCalled();
  });

  it('returns a timeout error verdict when scanning stalls', async () => {
    const { service } = createService({
      scanStream: async () => {
        throw new Error('ClamAV timeout while scanning');
      },
    });

    const result = await service.scanStream(Readable.from(['safe-content']), 'timeout.txt');

    expect(result.verdict).toBe('error');
    expect(result.error).toMatch(/timeout/i);
  });

  it('ping returns a boolean', async () => {
    const { service } = createService();

    expect(typeof (await service.ping())).toBe('boolean');
  });
});
