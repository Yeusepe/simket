/**
 * Purpose: Uppy-backed upload hook for CDNgine asset uploads in the storefront creator UI.
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md (§1 external ingress map)
 * External references:
 *   - https://uppy.io/docs/react/
 *   - https://uppy.io/docs/uppy/
 *   - https://uppy.io/docs/tus/
 * Tests:
 *   - packages/storefront/src/hooks/use-upload.test.ts
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import { useUppyState } from '@uppy/react';
import Tus, { type TusBody } from '@uppy/tus';
import type { Meta, UppyFile as CoreUppyFile } from '@uppy/core';
import {
  calculateProgress,
  validateFile,
  type UploadConfig,
  type UploadFile,
} from '../services/upload-service';

interface UploadMeta extends Meta {
  readonly assetId?: string;
  readonly uploadUrl?: string;
}

interface PresignUploadResponse {
  readonly uploadUrl: string;
  readonly assetId: string;
  readonly expiresAt?: string;
}

type UploadErrorMap = Readonly<Record<string, string>>;
type StorefrontUppyFile = CoreUppyFile<UploadMeta, TusBody>;

export interface UseUploadReturn {
  readonly uppy: Uppy<UploadMeta, TusBody>;
  readonly addFiles: (files: readonly File[] | FileList) => void;
  readonly removeFile: (fileId: string) => void;
  readonly retryFile: (fileId: string) => Promise<void>;
  readonly upload: () => Promise<void>;
  readonly files: readonly UploadFile[];
  readonly isUploading: boolean;
  readonly reset: () => void;
}

function toRejectedUploadFile(fileId: string, file: File, error: string): UploadFile {
  return {
    id: fileId,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    progress: 0,
    status: 'error',
    error,
  };
}

async function requestPresignedUpload(
  endpoint: string,
  file: File,
): Promise<PresignUploadResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });

  if (!response.ok) {
    throw new Error(`Presign request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as Partial<PresignUploadResponse>;

  if (
    typeof payload.uploadUrl !== 'string' ||
    payload.uploadUrl.length === 0 ||
    typeof payload.assetId !== 'string' ||
    payload.assetId.length === 0
  ) {
    throw new Error('Presign response is missing uploadUrl or assetId.');
  }

  return {
    uploadUrl: payload.uploadUrl,
    assetId: payload.assetId,
    expiresAt: payload.expiresAt,
  };
}

function mapUppyFileToUploadFile(
  file: StorefrontUppyFile,
  uploadErrors: UploadErrorMap,
): UploadFile {
  const fileError =
    uploadErrors[file.id] ??
    (typeof (file as { error?: string | null }).error === 'string'
      ? (file as { error?: string | null }).error ?? undefined
      : undefined);

  const bytesUploaded =
    typeof file.progress?.bytesUploaded === 'number' ? file.progress.bytesUploaded : 0;
  const bytesTotal =
    typeof file.progress?.bytesTotal === 'number'
      ? file.progress.bytesTotal
      : (file.size ?? 0);

  const progress = calculateProgress(bytesUploaded, bytesTotal);

  let status: UploadFile['status'] = 'pending';

  if (file.progress?.uploadComplete) {
    status = 'complete';
  } else if (fileError) {
    status = 'error';
  } else if (file.progress?.uploadStarted) {
    status = 'uploading';
  }

  return {
    id: file.id,
    name: file.name,
    size: file.size ?? 0,
    mimeType: file.type,
    progress,
    status,
    error: fileError,
    assetId: typeof file.meta.assetId === 'string' ? file.meta.assetId : undefined,
  };
}

export function useUpload(config: UploadConfig): UseUploadReturn {
  const configRef = useRef(config);
  const invalidCounterRef = useRef(0);
  const [invalidFiles, setInvalidFiles] = useState<readonly UploadFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  configRef.current = config;

  const [uppy] = useState(
    () =>
      new Uppy<UploadMeta, TusBody>({
        id: 'storefront-asset-uploader',
        autoProceed: false,
        restrictions: {
          allowedFileTypes: [...config.allowedMimeTypes],
          maxFileSize: config.maxFileSize,
        },
      }).use(Tus<UploadMeta, TusBody>, {
        endpoint: config.tusEndpoint,
        retryDelays: [0, 1000, 3000, 5000],
        allowedMetaFields: ['name', 'type', 'assetId'],
      }),
  );

  useEffect(() => {
    const prepareUploads = async (fileIds: string[]) => {
      await Promise.all(
        fileIds.map(async (fileId) => {
          const file = uppy.getFile(fileId);
          if (!(file.data instanceof File)) {
            return;
          }

          try {
            const presigned = await requestPresignedUpload(
              configRef.current.presignEndpoint,
              file.data,
            );

            uppy.setFileMeta(fileId, {
              ...file.meta,
              assetId: presigned.assetId,
              uploadUrl: presigned.uploadUrl,
            });

            uppy.setFileState(fileId, {
              tus: {
                ...(file.tus ?? {}),
                endpoint: configRef.current.tusEndpoint,
                uploadUrl: presigned.uploadUrl,
              },
            });

            setUploadErrors((current) => {
              if (!(fileId in current)) {
                return current;
              }

              const next = { ...current };
              delete next[fileId];
              return next;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setUploadErrors((current) => ({
              ...current,
              [fileId]: message,
            }));
            throw error;
          }
        }),
      );
    };

    const handleUploadError = (file: StorefrontUppyFile | undefined, error: { message: string }) => {
      if (!file) {
        return;
      }

      setUploadErrors((current) => ({
        ...current,
        [file.id]: error.message,
      }));
    };

    const handleUploadSuccess = (file: StorefrontUppyFile | undefined) => {
      if (!file) {
        return;
      }

      setUploadErrors((current) => {
        if (!(file.id in current)) {
          return current;
        }

        const next = { ...current };
        delete next[file.id];
        return next;
      });
    };

    const handleFileRemoved = (file: StorefrontUppyFile) => {
      setUploadErrors((current) => {
        if (!(file.id in current)) {
          return current;
        }

        const next = { ...current };
        delete next[file.id];
        return next;
      });
    };

    uppy.addPreProcessor(prepareUploads);
    uppy.on('upload-error', handleUploadError);
    uppy.on('upload-success', handleUploadSuccess);
    uppy.on('file-removed', handleFileRemoved);

    return () => {
      uppy.removePreProcessor(prepareUploads);
      uppy.off('upload-error', handleUploadError);
      uppy.off('upload-success', handleUploadSuccess);
      uppy.off('file-removed', handleFileRemoved);
      uppy.destroy();
    };
  }, [uppy]);

  useEffect(() => {
    uppy.setOptions({
      restrictions: {
        allowedFileTypes: [...config.allowedMimeTypes],
        maxFileSize: config.maxFileSize,
      },
    });

    uppy.getPlugin('Tus')?.setOptions({
      endpoint: config.tusEndpoint,
    });
  }, [config.allowedMimeTypes, config.maxFileSize, config.tusEndpoint, uppy]);

  const uppyFiles = useUppyState(uppy, (state) => Object.values(state.files));

  const addFiles = useCallback(
    (files: readonly File[] | FileList) => {
      const selectedFiles = Array.from(files);

      for (const file of selectedFiles) {
        const validationError = validateFile(file, configRef.current);

        if (validationError) {
          invalidCounterRef.current += 1;
          const invalidId = `invalid-${invalidCounterRef.current}`;
          setInvalidFiles((current) => [
            ...current,
            toRejectedUploadFile(invalidId, file, validationError),
          ]);
          continue;
        }

        try {
          uppy.addFile(file);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          invalidCounterRef.current += 1;
          const invalidId = `invalid-${invalidCounterRef.current}`;
          setInvalidFiles((current) => [
            ...current,
            toRejectedUploadFile(invalidId, file, message),
          ]);
        }
      }
    },
    [uppy],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const invalidFile = invalidFiles.find((file) => file.id === fileId);
      if (invalidFile) {
        setInvalidFiles((current) => current.filter((file) => file.id !== fileId));
        return;
      }

      uppy.removeFile(fileId);
    },
    [invalidFiles, uppy],
  );

  const retryFile = useCallback(
    async (fileId: string) => {
      setUploadErrors((current) => {
        if (!(fileId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[fileId];
        return next;
      });

      await uppy.retryUpload(fileId);
    },
    [uppy],
  );

  const upload = useCallback(async () => {
    try {
      await uppy.upload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextErrors = uppy.getFiles().reduce<Record<string, string>>((current, file) => {
        current[file.id] = message;
        return current;
      }, {});
      setUploadErrors((current) => ({
        ...current,
        ...nextErrors,
      }));
    }
  }, [uppy]);

  const reset = useCallback(() => {
    uppy.cancelAll();
    uppy.clear();
    setInvalidFiles([]);
    setUploadErrors({});
  }, [uppy]);

  const files = useMemo<readonly UploadFile[]>(
    () => [
      ...uppyFiles.map((file) => mapUppyFileToUploadFile(file, uploadErrors)),
      ...invalidFiles,
    ],
    [invalidFiles, uppyFiles, uploadErrors],
  );

  const isUploading = useMemo(
    () =>
      files.some((file) => file.status === 'uploading') ||
      uppyFiles.some((file) => Boolean(file.progress?.uploadStarted) && !file.progress?.uploadComplete),
    [files, uppyFiles],
  );

  return {
    uppy,
    addFiles,
    removeFile,
    retryFile,
    upload,
    files,
    isUploading,
    reset,
  };
}
