/**
 * Purpose: Verify upload file validation and formatting helpers for the storefront uploader.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 CDNgine owns artefacts)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md (§1 external ingress map)
 * External references:
 *   - https://uppy.io/docs/uppy/
 *   - https://uppy.io/docs/tus/
 * Tests:
 *   - packages/storefront/src/services/upload-service.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  calculateProgress,
  formatFileSize,
  isResumableUpload,
  validateFile,
  type UploadConfig,
} from './upload-service';

const TEST_CONFIG: UploadConfig = {
  presignEndpoint: '/api/uploads/presign',
  tusEndpoint: '/files',
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/png', 'video/mp4'],
};

describe('validateFile', () => {
  it('accepts a valid file', () => {
    const file = new File(['binary'], 'hero.png', { type: 'image/png' });

    expect(validateFile(file, TEST_CONFIG)).toBeUndefined();
  });

  it('rejects an oversized file', () => {
    const file = new File([new Uint8Array(TEST_CONFIG.maxFileSize + 1)], 'large.mp4', {
      type: 'video/mp4',
    });

    expect(validateFile(file, TEST_CONFIG)).toBe(
      'large.mp4 exceeds the 10.0 MB file size limit.',
    );
  });

  it('rejects a file with an unsupported MIME type', () => {
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    expect(validateFile(file, TEST_CONFIG)).toBe(
      'notes.txt has an unsupported file type: text/plain.',
    );
  });

  it('rejects a file with an empty name', () => {
    const file = new File([''], '', { type: 'image/png' });

    expect(validateFile(file, TEST_CONFIG)).toBe('File name is required.');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(999)).toBe('999 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

describe('calculateProgress', () => {
  it('returns 0 when nothing has uploaded', () => {
    expect(calculateProgress(0, 100)).toBe(0);
  });

  it('returns 50 for a half-complete upload', () => {
    expect(calculateProgress(50, 100)).toBe(50);
  });

  it('returns 100 for a complete upload', () => {
    expect(calculateProgress(100, 100)).toBe(100);
  });

  it('returns 0 when total bytes is 0', () => {
    expect(calculateProgress(10, 0)).toBe(0);
  });
});

describe('isResumableUpload', () => {
  it('returns false for files up to 5 MB', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'small.png', {
      type: 'image/png',
    });

    expect(isResumableUpload(file)).toBe(false);
  });

  it('returns true for files larger than 5 MB', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });

    expect(isResumableUpload(file)).toBe(true);
  });
});
