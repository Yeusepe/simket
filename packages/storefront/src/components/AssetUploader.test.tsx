/**
 * Purpose: Verify the storefront asset uploader UI states and file rendering.
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 * External references:
 *   - https://uppy.io/docs/react/
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/progress-bar
 * Tests:
 *   - packages/storefront/src/components/AssetUploader.test.tsx
 */
import { render, screen } from '@testing-library/react';
import Uppy from '@uppy/core';
import { describe, expect, it, vi } from 'vitest';
import { AssetUploader } from './AssetUploader';
import type { UseUploadReturn } from '../hooks/use-upload';
import type { UploadConfig, UploadFile } from '../services/upload-service';

const TEST_CONFIG: UploadConfig = {
  presignEndpoint: '/api/uploads/presign',
  tusEndpoint: '/files',
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/png', 'video/mp4'],
};

function makeUploadFile(overrides: Partial<UploadFile> = {}): UploadFile {
  return {
    id: 'file-1',
    name: 'hero.png',
    size: 1024,
    mimeType: 'image/png',
    progress: 0,
    status: 'pending',
    ...overrides,
  };
}

function makeUploadReturn(overrides: Partial<UseUploadReturn> = {}): UseUploadReturn {
  return {
    uppy: new Uppy(),
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    retryFile: vi.fn(),
    upload: vi.fn(async () => undefined),
    files: [],
    isUploading: false,
    reset: vi.fn(),
    ...overrides,
  };
}

describe('AssetUploader', () => {
  it('renders the drop zone', () => {
    render(
      <AssetUploader
        config={TEST_CONFIG}
        useUploadHook={() => makeUploadReturn()}
      />,
    );

    expect(screen.getByTestId('asset-uploader-dropzone')).toBeInTheDocument();
  });

  it('shows the empty state message', () => {
    render(
      <AssetUploader
        config={TEST_CONFIG}
        useUploadHook={() => makeUploadReturn()}
      />,
    );

    expect(screen.getByText('No files selected yet.')).toBeInTheDocument();
  });

  it('displays the file list when files are present', () => {
    render(
      <AssetUploader
        config={TEST_CONFIG}
        useUploadHook={() =>
          makeUploadReturn({
            files: [makeUploadFile()],
          })
        }
      />,
    );

    expect(screen.getByText('hero.png')).toBeInTheDocument();
  });

  it('shows progress for uploading files', () => {
    render(
      <AssetUploader
        config={TEST_CONFIG}
        useUploadHook={() =>
          makeUploadReturn({
            files: [
              makeUploadFile({
                progress: 55,
                status: 'uploading',
              }),
            ],
          })
        }
      />,
    );

    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('shows error state for failed files', () => {
    render(
      <AssetUploader
        config={TEST_CONFIG}
        useUploadHook={() =>
          makeUploadReturn({
            files: [
              makeUploadFile({
                status: 'error',
                error: 'Upload failed.',
              }),
            ],
          })
        }
      />,
    );

    expect(screen.getByText('Upload failed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
