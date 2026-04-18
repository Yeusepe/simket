/**
 * Purpose: Shared storefront upload types and pure helper functions for CDNgine asset uploads.
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md (§1 external ingress map)
 * External references:
 *   - https://uppy.io/docs/uppy/
 *   - https://uppy.io/docs/tus/
 * Tests:
 *   - packages/storefront/src/services/upload-service.test.ts
 */

export interface UploadConfig {
  readonly presignEndpoint: string;
  readonly tusEndpoint: string;
  readonly maxFileSize: number;
  readonly allowedMimeTypes: readonly string[];
}

export interface UploadFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
  readonly progress: number;
  readonly status: 'pending' | 'uploading' | 'complete' | 'error';
  readonly error?: string;
  readonly assetId?: string;
}

const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024;
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function validateFile(file: File, config: UploadConfig): string | undefined {
  if (file.name.trim().length === 0) {
    return 'File name is required.';
  }

  if (file.size > config.maxFileSize) {
    return `${file.name} exceeds the ${formatFileSize(config.maxFileSize)} file size limit.`;
  }

  if (!config.allowedMimeTypes.includes(file.type)) {
    return `${file.name} has an unsupported file type: ${file.type || 'unknown'}.`;
  }

  return undefined;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
}

export function calculateProgress(uploaded: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const percentage = Math.round((uploaded / total) * 100);
  return Math.max(0, Math.min(100, percentage));
}

export function isResumableUpload(file: File): boolean {
  return file.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES;
}
