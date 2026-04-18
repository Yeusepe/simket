/**
 * Purpose: Unit tests for the ExifTool metadata stripping service and pure helpers.
 * Governing docs:
 *   - docs/architecture.md (§2 Every outbound call through Cockatiel, §5 Service ownership)
 *   - docs/service-architecture.md (§1.3 CDNgine API, §5 media lifecycle boundaries)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://photostructure.github.io/exiftool-vendored.js/
 *   - https://exiftool.org/exiftool_pod.html
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/ExifTool.d.ts
 *   - packages/vendure-server/node_modules/exiftool-vendored/dist/ExifToolOptions.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/exiftool/exiftool.service.test.ts
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Tags, WriteTaskResult } from 'exiftool-vendored';
import type { ExifToolConfig, MetadataResult } from './exiftool.types.js';
import {
  DEFAULT_EXIFTOOL_CONFIG,
  ExifToolMetadataService,
  countMetadataFields,
  filterPreservedFields,
  hasDeviceMetadata,
  hasGpsMetadata,
} from './exiftool.service.js';

interface FakeExifToolClient {
  readRaw: ReturnType<typeof vi.fn<(file: string) => Promise<Tags>>>;
  write: ReturnType<typeof vi.fn<(file: string, tags: Record<string, never>, options: { writeArgs: string[] }) => Promise<WriteTaskResult>>>;
  end: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

const TEST_DIR = path.resolve(
  'C:\\Users\\svalp\\OneDrive\\Documents\\Development\\antiwork\\simket\\packages\\vendure-server',
  '.test-artifacts',
  'exiftool',
);

function createClient(tags: Tags): FakeExifToolClient {
  return {
    readRaw: vi.fn(async () => tags),
    write: vi.fn(async () => ({ created: 0, updated: 1, unchanged: 0 })),
    end: vi.fn(async () => undefined),
  };
}

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('hasGpsMetadata', () => {
  it('returns true when GPS fields are present', () => {
    expect(hasGpsMetadata({ GPSLatitude: 40.7128, GPSLongitude: -74.006 })).toBe(true);
  });

  it('returns false when GPS fields are absent', () => {
    expect(hasGpsMetadata({ Make: 'Canon' })).toBe(false);
  });
});

describe('hasDeviceMetadata', () => {
  it('returns true when device-identifying fields are present', () => {
    expect(hasDeviceMetadata({ Make: 'Apple', Model: 'iPhone 15 Pro' })).toBe(true);
  });

  it('returns false when device-identifying fields are absent', () => {
    expect(hasDeviceMetadata({ Copyright: 'Simket' })).toBe(false);
  });
});

describe('countMetadataFields', () => {
  it('counts defined metadata fields', () => {
    expect(
      countMetadataFields({
        Make: 'Sony',
        Model: 'A7',
        GPSLatitude: undefined,
        GPSLongitude: null,
      }),
    ).toBe(2);
  });

  it('returns zero for empty metadata', () => {
    expect(countMetadataFields({})).toBe(0);
  });
});

describe('filterPreservedFields', () => {
  it('keeps only the requested fields', () => {
    expect(
      filterPreservedFields(
        {
          Copyright: '© Simket',
          License: 'CC-BY-4.0',
          Artist: 'Ignored',
        },
        ['Copyright', 'License'],
      ),
    ).toEqual({
      Copyright: '© Simket',
      License: 'CC-BY-4.0',
    });
  });

  it('returns an empty object for missing fields', () => {
    expect(filterPreservedFields({ Make: 'Nikon' }, ['Copyright'])).toEqual({});
  });
});

describe('ExifToolMetadataService defaults', () => {
  it('exposes privacy-preserving default configuration', () => {
    const expected: ExifToolConfig = {
      maxProcs: DEFAULT_EXIFTOOL_CONFIG.maxProcs,
      taskTimeoutMs: 30_000,
      preserveFields: ['Copyright', 'License'],
    };

    expect(DEFAULT_EXIFTOOL_CONFIG).toEqual(expected);
  });
});

describe('ExifToolMetadataService validation', () => {
  it('rejects unsupported file extensions before invoking ExifTool', async () => {
    const client = createClient({ MIMEType: 'application/octet-stream' });
    const service = new ExifToolMetadataService(undefined, { exiftool: client });

    await expect(service.readMetadata('C:\\uploads\\malware.exe')).rejects.toThrow(/unsupported/i);
    expect(client.readRaw).not.toHaveBeenCalled();
  });
});

describe('ExifToolMetadataService.stripMetadata', () => {
  it('applies default preserved fields and returns metadata result structure', async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const filePath = path.join(TEST_DIR, 'asset.jpg');
    await writeFile(filePath, Buffer.from('test-image-data'));

    const readResponses: Tags[] = [
      {
        MIMEType: 'image/jpeg',
        GPSLatitude: 40.7128,
        GPSLongitude: -74.006,
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        Copyright: '© Simket',
        License: 'CC-BY-4.0',
      },
      {
        MIMEType: 'image/jpeg',
        Copyright: '© Simket',
        License: 'CC-BY-4.0',
      },
    ];

    const client: FakeExifToolClient = {
      readRaw: vi.fn(async () => {
        const next = readResponses.shift();
        if (!next) {
          throw new Error('no more responses');
        }
        return next;
      }),
      write: vi.fn(async () => ({ created: 0, updated: 1, unchanged: 0 })),
      end: vi.fn(async () => undefined),
    };

    const service = new ExifToolMetadataService(undefined, {
      exiftool: client,
      now: vi
        .fn()
        .mockReturnValueOnce(1_000)
        .mockReturnValueOnce(1_025),
    });

    const result = await service.stripMetadata(filePath);

    expect(client.write).toHaveBeenCalledOnce();
    expect(client.write.mock.calls[0]?.[2].writeArgs).toEqual([
      '-all=',
      '-overwrite_original',
      '-Copyright<Copyright',
      '-License<License',
    ]);

    const expectedResult: MetadataResult = {
      filename: 'asset.jpg',
      fileSize: Buffer.byteLength('test-image-data'),
      mimeType: 'image/jpeg',
      hasGpsData: true,
      hasDeviceInfo: true,
      fieldCount: 6,
      strippedFieldCount: 4,
      preservedFields: {
        Copyright: '© Simket',
        License: 'CC-BY-4.0',
      },
      durationMs: 25,
    };

    expect(result).toEqual(expectedResult);
  });
});
