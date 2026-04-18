/**
 * Purpose: Verify the Uppy-backed storefront upload hook state management.
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 * External references:
 *   - https://uppy.io/docs/react/
 *   - https://uppy.io/docs/uppy/
 *   - https://uppy.io/docs/tus/
 * Tests:
 *   - packages/storefront/src/hooks/use-upload.test.ts
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUpload } from './use-upload';
import type { UploadConfig } from '../services/upload-service';

const TEST_CONFIG: UploadConfig = {
  presignEndpoint: '/api/uploads/presign',
  tusEndpoint: '/files',
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/png', 'video/mp4'],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useUpload', () => {
  it('initializes with an empty file list', () => {
    const { result } = renderHook(() => useUpload(TEST_CONFIG));

    expect(result.current.files).toEqual([]);
    expect(result.current.isUploading).toBe(false);
  });

  it('adds files to the list', async () => {
    const { result } = renderHook(() => useUpload(TEST_CONFIG));
    const file = new File(['binary'], 'hero.png', { type: 'image/png' });

    await act(async () => {
      result.current.addFiles([file]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]).toMatchObject({
      name: 'hero.png',
      mimeType: 'image/png',
      status: 'pending',
    });
  });

  it('removes files from the list', async () => {
    const { result } = renderHook(() => useUpload(TEST_CONFIG));
    const file = new File(['binary'], 'hero.png', { type: 'image/png' });

    await act(async () => {
      result.current.addFiles([file]);
    });

    const uploadFile = result.current.files[0];
    expect(uploadFile).toBeDefined();

    act(() => {
      result.current.removeFile(uploadFile!.id);
    });

    expect(result.current.files).toEqual([]);
  });

  it('surfaces validation errors per file', async () => {
    const { result } = renderHook(() => useUpload(TEST_CONFIG));
    const invalidFile = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    await act(async () => {
      result.current.addFiles([invalidFile]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]).toMatchObject({
      name: 'notes.txt',
      status: 'error',
      error: 'notes.txt has an unsupported file type: text/plain.',
    });
  });
});
