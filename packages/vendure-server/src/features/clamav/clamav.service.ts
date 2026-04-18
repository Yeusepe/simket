/**
 * Purpose: ClamAV service backed by clamd over TCP for malware scanning.
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
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import NodeClam from 'clamscan';
import {
  TaskCancelledError,
  createResiliencePolicy,
  type ResiliencePolicy,
} from '../../resilience/resilience.js';
import type {
  ClamavConfig,
  ClamavService,
  QuarantineRecord,
  ScanResult,
} from './clamav.types.js';

interface ClamStreamResult {
  readonly file: string;
  readonly isInfected: boolean | null;
  readonly viruses: string[];
}

interface ClamClient {
  ping(): Promise<unknown>;
  getVersion(): Promise<string>;
  scanStream(stream: Readable): Promise<ClamStreamResult>;
}

interface ClamavScannerServiceOptions {
  readonly clientFactory?: (config: ClamavConfig) => Promise<ClamClient>;
  readonly policy?: ResiliencePolicy;
  readonly now?: () => number;
  readonly tracer?: Tracer;
}

const tracer = trace.getTracer('simket-clamav');

export function validateClamavConfig(config: ClamavConfig): ClamavConfig {
  if (!config.host || config.host.trim().length === 0) {
    throw new Error('ClamAV host must not be empty');
  }
  if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65_535) {
    throw new Error('ClamAV port must be an integer between 1 and 65535');
  }
  if (!Number.isFinite(config.timeout) || config.timeout <= 0) {
    throw new Error('ClamAV timeout must be a positive number');
  }
  if (!Number.isSafeInteger(config.maxFileSize) || config.maxFileSize <= 0) {
    throw new Error('ClamAV max file size must be a positive integer');
  }

  return config;
}

export function parseClamdResponse(_response: string): Pick<ScanResult, 'verdict' | 'threat' | 'error'> {
  const response = _response.replace(/\u0000/g, '').trim();

  if (/:\s+OK$/i.test(response)) {
    return { verdict: 'clean' };
  }

  const infectedMatch = response.match(/:\s+(.+?)\s+FOUND$/i);
  if (infectedMatch?.[1]) {
    return {
      verdict: 'infected',
      threat: infectedMatch[1].trim(),
    };
  }

  return {
    verdict: 'error',
    error: response.length > 0 ? response : 'Unknown clamd response',
  };
}

export function buildQuarantineRecord(result: ScanResult): QuarantineRecord | undefined {
  if (result.verdict !== 'infected' || !result.threat) {
    return undefined;
  }

  return {
    filename: result.filename,
    threat: result.threat,
    scannedAt: result.scannedAt,
    fileSize: result.fileSize,
    quarantineId: randomUUID(),
  };
}

async function createClamavClient(config: ClamavConfig): Promise<ClamClient> {
  const client = await new NodeClam().init({
    clamscan: {
      active: false,
    },
    clamdscan: {
      active: true,
      host: config.host,
      port: config.port,
      timeout: config.timeout,
      localFallback: false,
      bypassTest: true,
    },
    preference: 'clamdscan',
  });

  return client as unknown as ClamClient;
}

function normalizeError(error: unknown): string {
  if (error instanceof TaskCancelledError) {
    return 'ClamAV scan timed out';
  }
  if (error instanceof Error) {
    return /timeout/i.test(error.message) ? error.message : error.message.trim();
  }

  return 'Unknown ClamAV error';
}

async function readStreamToBuffer(
  stream: NodeJS.ReadableStream,
  maxFileSize: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of stream) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bufferChunk.length;
    if (size > maxFileSize) {
      throw new Error(`File exceeds max file size of ${maxFileSize} bytes`);
    }
    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks);
}

function createScanResult(
  filename: string,
  fileSize: number,
  startedAt: number,
  completedAt: number,
  verdict: ScanResult['verdict'],
  details: Pick<ScanResult, 'threat' | 'error'> = {},
): ScanResult {
  return {
    verdict,
    filename,
    fileSize,
    scannedAt: new Date(completedAt).toISOString(),
    durationMs: Math.max(1, completedAt - startedAt),
    ...details,
  };
}

@Injectable()
export class ClamavScannerService implements ClamavService {
  private readonly config: ClamavConfig;

  private readonly clientFactory: (config: ClamavConfig) => Promise<ClamClient>;

  private readonly policy: ResiliencePolicy;

  private readonly now: () => number;

  private readonly tracer: Tracer;

  private clientPromise?: Promise<ClamClient>;

  constructor(config: ClamavConfig, options: ClamavScannerServiceOptions = {}) {
    this.config = validateClamavConfig(config);
    this.clientFactory = options.clientFactory ?? createClamavClient;
    this.policy =
      options.policy ??
      createResiliencePolicy('clamav', {
        timeout: this.config.timeout,
        retry: { maxAttempts: 2, initialDelay: 200, maxDelay: 2_000 },
        circuitBreaker: { threshold: 0.25, duration: 30_000, minimumRps: 1 },
      });
    this.now = options.now ?? (() => Date.now());
    this.tracer = options.tracer ?? tracer;
  }

  async scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
    if (buffer.length > this.config.maxFileSize) {
      return this.buildValidationErrorResult(
        filename,
        buffer.length,
        `File exceeds max file size of ${this.config.maxFileSize} bytes`,
      );
    }

    return this.tracer.startActiveSpan('clamav.scanBuffer', async (span) => {
      const startedAt = this.now();
      span.setAttribute('clamav.filename', filename);
      span.setAttribute('clamav.file_size', buffer.length);

      try {
        const client = await this.getClient();
        const response = await this.policy.execute(() =>
          client.scanStream(Readable.from([buffer])),
        );

        const result =
          response.isInfected === true
            ? createScanResult(
                filename,
                buffer.length,
                startedAt,
                this.now(),
                'infected',
                {
                  threat: response.viruses[0] ?? 'Unknown threat',
                },
              )
            : response.isInfected === false
              ? createScanResult(
                  filename,
                  buffer.length,
                  startedAt,
                  this.now(),
                  'clean',
                )
              : createScanResult(
                  filename,
                  buffer.length,
                  startedAt,
                  this.now(),
                  'error',
                  {
                    error: 'ClamAV returned an indeterminate scan result',
                  },
                );

        span.setAttribute('clamav.verdict', result.verdict);
        span.setAttribute('clamav.duration_ms', result.durationMs);
        if (result.threat) {
          span.setAttribute('clamav.threat', result.threat);
        }

        return result;
      } catch (error) {
        const result = createScanResult(
          filename,
          buffer.length,
          startedAt,
          this.now(),
          'error',
          {
            error: normalizeError(error),
          },
        );
        span.setAttribute('clamav.verdict', result.verdict);
        span.setAttribute('clamav.duration_ms', result.durationMs);
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
        return result;
      } finally {
        span.end();
      }
    });
  }

  async scanStream(stream: NodeJS.ReadableStream, filename: string): Promise<ScanResult> {
    const startedAt = this.now();

    return this.tracer.startActiveSpan('clamav.scanStream', async (span) => {
      span.setAttribute('clamav.filename', filename);

      try {
        const buffer = await readStreamToBuffer(stream, this.config.maxFileSize);
        span.setAttribute('clamav.file_size', buffer.length);
        return await this.scanBuffer(buffer, filename);
      } catch (error) {
        const fileSize =
          error instanceof Error && /max file size/i.test(error.message)
            ? this.config.maxFileSize + 1
            : 0;
        const result = createScanResult(
          filename,
          fileSize,
          startedAt,
          this.now(),
          'error',
          {
            error: normalizeError(error),
          },
        );
        span.setAttribute('clamav.verdict', result.verdict);
        span.setAttribute('clamav.duration_ms', result.durationMs);
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
        return result;
      } finally {
        span.end();
      }
    });
  }

  async ping(): Promise<boolean> {
    return this.tracer.startActiveSpan('clamav.ping', async (span) => {
      try {
        const client = await this.getClient();
        await this.policy.execute(() => client.ping());
        span.setAttribute('clamav.available', true);
        return true;
      } catch (error) {
        span.setAttribute('clamav.available', false);
        span.setStatus({ code: SpanStatusCode.ERROR, message: normalizeError(error) });
        return false;
      } finally {
        span.end();
      }
    });
  }

  async version(): Promise<string> {
    return this.tracer.startActiveSpan('clamav.version', async (span) => {
      try {
        const client = await this.getClient();
        const version = await this.policy.execute(() => client.getVersion());
        span.setAttribute('clamav.version', version);
        return version;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: normalizeError(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private buildValidationErrorResult(
    filename: string,
    fileSize: number,
    error: string,
  ): ScanResult {
    const startedAt = this.now();
    return createScanResult(filename, fileSize, startedAt, this.now(), 'error', {
      error,
    });
  }

  private getClient(): Promise<ClamClient> {
    this.clientPromise ??= this.clientFactory(this.config);
    return this.clientPromise;
  }
}
