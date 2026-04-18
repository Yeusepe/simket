/**
 * Purpose: HeroUI-based CDNgine asset uploader using Uppy React hooks and tus uploads.
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md (§1 external ingress map)
 * External references:
 *   - https://uppy.io/docs/react/
 *   - https://uppy.io/docs/uppy/
 *   - https://uppy.io/docs/tus/
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/progress-bar
 * Tests:
 *   - packages/storefront/src/components/AssetUploader.test.tsx
 */
import { UppyContextProvider, useDropzone } from '@uppy/react';
import { Button, Card, ProgressBar } from '@heroui/react';
import type Uppy from '@uppy/core';
import { formatFileSize, type UploadConfig, type UploadFile } from '../services/upload-service';
import { useUpload, type UseUploadReturn } from '../hooks/use-upload';

export interface AssetUploaderProps {
  readonly config: UploadConfig;
  readonly useUploadHook?: (config: UploadConfig) => UseUploadReturn;
}

function getProgressColor(file: UploadFile): 'accent' | 'danger' | 'success' | 'default' {
  switch (file.status) {
    case 'complete':
      return 'success';
    case 'error':
      return 'danger';
    case 'uploading':
      return 'accent';
    default:
      return 'default';
  }
}

function AssetUploaderContent({
  config,
  upload,
}: {
  readonly config: UploadConfig;
  readonly upload: UseUploadReturn;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => {
      upload.addFiles(files);
    },
    onFileInputChange: (files) => {
      upload.addFiles(files);
    },
  });

  return (
    <Card className="gap-4">
      <Card.Header>
        <Card.Title>Asset uploader</Card.Title>
        <Card.Description>
          Drag files into the drop zone or browse to upload creator assets to CDNgine.
        </Card.Description>
      </Card.Header>

      <Card.Content className="gap-4">
        <div
          {...getRootProps()}
          data-testid="asset-uploader-dropzone"
          className="rounded-2xl border-2 border-dashed border-default-300 bg-default-50 px-6 py-10 text-center"
        >
          <input {...getInputProps()} />
          <p className="text-base font-medium">Drop files here or click to browse.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Max size {formatFileSize(config.maxFileSize)} · Allowed types:{' '}
            {config.allowedMimeTypes.join(', ')}
          </p>
        </div>

        {upload.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files selected yet.</p>
        ) : (
          <ul className="space-y-3">
            {upload.files.map((file) => (
              <li
                key={file.id}
                className="rounded-2xl border border-default-200 bg-background px-4 py-3"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} · {file.mimeType || 'unknown'}
                    </p>
                    <p className="text-sm capitalize text-foreground">{file.status}</p>
                    {file.error ? (
                      <p className="mt-1 text-sm text-danger" role="alert">
                        {file.error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {file.status === 'error' ? (
                      <Button variant="outline" onPress={() => void upload.retryFile(file.id)}>
                        Retry
                      </Button>
                    ) : null}
                    <Button
                      variant={file.status === 'uploading' ? 'danger' : 'secondary'}
                      onPress={() => upload.removeFile(file.id)}
                    >
                      {file.status === 'uploading' ? 'Cancel' : 'Remove'}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{file.progress}%</span>
                  </div>
                  <ProgressBar
                    aria-label={`${file.name} upload progress`}
                    color={getProgressColor(file)}
                    value={file.progress}
                  >
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>

      <Card.Footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          isDisabled={upload.files.length === 0}
          onPress={upload.reset}
        >
          Reset
        </Button>
        <Button
          isPending={upload.isUploading}
          isDisabled={upload.files.length === 0}
          onPress={() => void upload.upload()}
        >
          {upload.isUploading ? 'Uploading…' : 'Upload files'}
        </Button>
      </Card.Footer>
    </Card>
  );
}

export function AssetUploader({
  config,
  useUploadHook = useUpload,
}: AssetUploaderProps) {
  const upload = useUploadHook(config);

  return (
    <UppyContextProvider uppy={upload.uppy as unknown as Uppy}>
      <AssetUploaderContent config={config} upload={upload} />
    </UppyContextProvider>
  );
}
