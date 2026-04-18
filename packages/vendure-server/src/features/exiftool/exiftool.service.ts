/**
 * Purpose: Read and strip creator asset metadata with ExifTool while preserving privacy-safe fields.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.3 CDNgine API, §5 media lifecycle boundaries)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://photostructure.github.io/exiftool-vendored.js/
 *   - https://photostructure.github.io/exiftool-vendored.js/classes/ExifTool.ExifTool.html
 *   - https://photostructure.github.io/exiftool-vendored.js/interfaces/ExifTool.ExifToolOptions.html
 *   - https://exiftool.org/exiftool_pod.html
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/ExifTool.d.ts
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/ExifToolOptions.d.ts
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/ReadTask.d.ts
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/WriteTask.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/exiftool/exiftool.service.test.ts
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import {
  ExifTool,
  type ExifToolOptions,
  type Tags,
  type WriteTaskResult,
} from 'exiftool-vendored';
import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import type {
  ExifToolConfig,
  MetadataReadResult,
  MetadataResult,
} from './exiftool.types.js';

interface FileSystemLike {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  readFile(path: string): Promise<Buffer>;
  rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<{ size: number }>;
  writeFile(path: string, data: Buffer): Promise<void>;
}

interface ExifToolLike {
  readRaw<T extends Tags = Tags>(
    file: string,
    options?: { readArgs?: string[] },
  ): Promise<T>;
  write(
    file: string,
    tags: Record<string, never>,
    options?: { writeArgs?: string[] },
  ): Promise<WriteTaskResult>;
  end(gracefully?: boolean): Promise<void>;
}

interface ExifToolMetadataServiceOptions {
  readonly exiftool?: ExifToolLike;
  readonly fs?: FileSystemLike;
  readonly now?: () => number;
  readonly tracer?: Tracer;
  readonly tempRoot?: string;
  readonly idFactory?: () => string;
}

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TEMP_ROOT = path.join(PACKAGE_ROOT, '.simket-temp', 'exiftool');
const FULL_READ_ARGS: string[] = [];
const DEFAULT_MIME_TYPE = 'application/octet-stream';
const EXCLUDED_FIELD_NAMES = new Set([
  'SourceFile',
  'ExifToolVersion',
  'Warning',
  'Error',
  'Directory',
  'FileName',
  'FilePermissions',
  'MIMEType',
  'ImageWidth',
  'ImageHeight',
]);
const GPS_FIELD_NAMES = ['GPSLatitude', 'GPSLongitude'] as const;
const DEVICE_FIELD_NAMES = ['Make', 'Model', 'Software'] as const;

export const DEFAULT_EXIFTOOL_CONFIG: ExifToolConfig = {
  maxProcs: 4,
  taskTimeoutMs: 30_000,
  preserveFields: ['Copyright', 'License'],
};

export const SUPPORTED_EXIFTOOL_EXTENSIONS = new Set([
  '.3g2',
  '.3gp',
  '.avi',
  '.avif',
  '.gif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.png',
  '.qt',
  '.tif',
  '.tiff',
  '.webm',
  '.webp',
]);

export function hasGpsMetadata(fields: Record<string, unknown>): boolean {
  return GPS_FIELD_NAMES.some((field) => hasMeaningfulValue(fields[field]));
}

export function hasDeviceMetadata(fields: Record<string, unknown>): boolean {
  return DEVICE_FIELD_NAMES.some((field) => hasMeaningfulValue(fields[field]));
}

export function countMetadataFields(fields: Record<string, unknown>): number {
  return Object.entries(fields).filter(
    ([key, value]) => !isIntrinsicField(key) && hasMeaningfulValue(value),
  ).length;
}

export function filterPreservedFields(
  fields: Record<string, unknown>,
  preserve: readonly string[],
): Record<string, string> {
  return preserve.reduce<Record<string, string>>((acc, field) => {
    const value = fields[field];
    const normalized = toMetadataString(value);
    if (normalized !== undefined) {
      acc[field] = normalized;
    }
    return acc;
  }, {});
}

@Injectable()
export class ExifToolMetadataService implements OnModuleDestroy {
  private readonly tracer: Tracer;
  private readonly baseConfig: ExifToolConfig;
  private readonly exiftool: ExifToolLike;
  private readonly ownsExiftool: boolean;
  private readonly fs: FileSystemLike;
  private readonly now: () => number;
  private readonly tempRoot: string;
  private readonly idFactory: () => string;

  constructor(
    config: Partial<ExifToolConfig> = {},
    options: ExifToolMetadataServiceOptions = {},
  ) {
    this.baseConfig = resolveConfig(config);
    this.tracer = options.tracer ?? trace.getTracer('simket-exiftool');
    this.fs = options.fs ?? {
      mkdir,
      readFile,
      rm,
      stat,
      writeFile,
    };
    this.now = options.now ?? (() => Date.now());
    this.tempRoot = options.tempRoot ?? TEMP_ROOT;
    this.idFactory = options.idFactory ?? (() => randomUUID());
    this.exiftool =
      options.exiftool ?? createExifToolClient(this.baseConfig);
    this.ownsExiftool = options.exiftool === undefined;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ownsExiftool) {
      await this.exiftool.end(true);
    }
  }

  async readMetadata(filePath: string): Promise<MetadataReadResult> {
    return this.tracer.startActiveSpan('exiftool.readMetadata', async (span) => {
      const filename = path.basename(filePath);
      span.setAttribute('exiftool.filename', filename);
      span.setAttribute('exiftool.file_path', filePath);

      try {
        assertSupportedFileExtension(filePath);
        const fields = await this.readFields(filePath, this.exiftool);
        const hasGpsData = hasGpsMetadata(fields);
        const hasDeviceInfo = hasDeviceMetadata(fields);

        span.setAttribute('exiftool.field_count', countMetadataFields(fields));
        span.setAttribute('exiftool.has_gps', hasGpsData);
        span.setAttribute('exiftool.has_device_info', hasDeviceInfo);

        return {
          filename,
          fields,
          hasGpsData,
          hasDeviceInfo,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async stripMetadata(
    filePath: string,
    config: Partial<ExifToolConfig> = {},
  ): Promise<MetadataResult> {
    return this.tracer.startActiveSpan('exiftool.stripMetadata', async (span) => {
      const startedAt = this.now();
      const filename = path.basename(filePath);
      span.setAttribute('exiftool.filename', filename);
      span.setAttribute('exiftool.file_path', filePath);

      const effectiveConfig = resolveConfig({ ...this.baseConfig, ...config });
      const usesBaseClient = shouldUseBaseClient(this.baseConfig, effectiveConfig) || !this.ownsExiftool;
      const client = usesBaseClient
        ? this.exiftool
        : createExifToolClient(effectiveConfig);

      try {
        assertSupportedFileExtension(filePath);

        const before = await this.readFields(filePath, client);
        const writeArgs = buildStripWriteArgs(effectiveConfig.preserveFields);
        await client.write(filePath, {}, { writeArgs });
        const after = await this.readFields(filePath, client);
        const fileStats = await this.fs.stat(filePath);
        const fieldCount = countMetadataFields(before);
        const strippedFieldCount = Math.max(fieldCount - countMetadataFields(after), 0);
        const preservedFields = filterPreservedFields(after, effectiveConfig.preserveFields);
        const hasGpsData = hasGpsMetadata(before);
        const hasDeviceInfo = hasDeviceMetadata(before);
        const mimeType = getMimeType(after, before);
        const durationMs = this.now() - startedAt;

        span.setAttribute('exiftool.field_count', fieldCount);
        span.setAttribute('exiftool.stripped_field_count', strippedFieldCount);
        span.setAttribute('exiftool.file_size', fileStats.size);
        span.setAttribute('exiftool.mime_type', mimeType);
        span.setAttribute('exiftool.has_gps', hasGpsData);
        span.setAttribute('exiftool.has_device_info', hasDeviceInfo);
        span.setAttribute('exiftool.preserved_field_count', Object.keys(preservedFields).length);
        span.setAttribute('exiftool.duration_ms', durationMs);

        return {
          filename,
          fileSize: fileStats.size,
          mimeType,
          hasGpsData,
          hasDeviceInfo,
          fieldCount,
          strippedFieldCount,
          preservedFields,
          durationMs,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        if (!usesBaseClient) {
          await client.end(true);
        }
        span.end();
      }
    });
  }

  async stripBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<{ buffer: Buffer; result: MetadataResult }> {
    return this.tracer.startActiveSpan('exiftool.stripBuffer', async (span) => {
      const workDir = path.join(this.tempRoot, this.idFactory());
      const filePath = path.join(workDir, sanitizeFilename(filename));
      span.setAttribute('exiftool.filename', filename);
      span.setAttribute('exiftool.file_path', filePath);

      try {
        assertSupportedFileExtension(filename);
        await this.fs.mkdir(workDir, { recursive: true });
        await this.fs.writeFile(filePath, buffer);

        const result = await this.stripMetadata(filePath);
        const strippedBuffer = await this.fs.readFile(filePath);

        span.setAttribute('exiftool.file_size_before', buffer.length);
        span.setAttribute('exiftool.file_size_after', strippedBuffer.length);

        return {
          buffer: strippedBuffer,
          result: {
            ...result,
            fileSize: strippedBuffer.length,
          },
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        await this.fs.rm(workDir, { recursive: true, force: true });
        span.end();
      }
    });
  }

  private async readFields(
    filePath: string,
    client: ExifToolLike,
  ): Promise<Record<string, unknown>> {
    const tags = await client.readRaw(filePath, { readArgs: FULL_READ_ARGS });
    return normalizeFields(tags);
  }
}

function resolveConfig(config: Partial<ExifToolConfig>): ExifToolConfig {
  return {
    maxProcs: config.maxProcs ?? DEFAULT_EXIFTOOL_CONFIG.maxProcs,
    taskTimeoutMs: config.taskTimeoutMs ?? DEFAULT_EXIFTOOL_CONFIG.taskTimeoutMs,
    preserveFields: config.preserveFields ?? DEFAULT_EXIFTOOL_CONFIG.preserveFields,
  };
}

function createExifToolClient(config: ExifToolConfig): ExifToolLike {
  const options: Partial<ExifToolOptions> = {
    maxProcs: config.maxProcs,
    taskTimeoutMillis: config.taskTimeoutMs,
  };

  return new ExifTool(options);
}

function shouldUseBaseClient(
  baseConfig: ExifToolConfig,
  requestedConfig: ExifToolConfig,
): boolean {
  return (
    baseConfig.maxProcs === requestedConfig.maxProcs &&
    baseConfig.taskTimeoutMs === requestedConfig.taskTimeoutMs
  );
}

function normalizeFields(tags: Tags): Record<string, unknown> {
  return Object.entries(tags).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (hasMeaningfulValue(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function isIntrinsicField(key: string): boolean {
  return EXCLUDED_FIELD_NAMES.has(key) || key.startsWith('File');
}

function toMetadataString(value: unknown): string | undefined {
  if (!hasMeaningfulValue(value)) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ');
  }
  return JSON.stringify(value);
}

function buildStripWriteArgs(preserveFields: readonly string[]): string[] {
  return [
    '-all=',
    '-overwrite_original',
    ...preserveFields.map((field) => `-${field}<${field}`),
  ];
}

function getMimeType(
  ...sources: Array<Record<string, unknown>>
): string {
  for (const source of sources) {
    const value = source['MIMEType'];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return DEFAULT_MIME_TYPE;
}

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename);
  return basename.length > 0 ? basename : `upload-${randomUUID()}`;
}

function assertSupportedFileExtension(filePath: string): void {
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXIFTOOL_EXTENSIONS.has(extension)) {
    throw new Error(
      `ExifToolMetadataService: unsupported file extension "${extension || '(none)'}"`,
    );
  }
}
