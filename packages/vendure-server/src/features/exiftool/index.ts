/**
 * Purpose: Barrel exports for the ExifTool metadata feature.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.3 CDNgine API)
 * External references:
 *   - https://photostructure.github.io/exiftool-vendored.js/
 *   - https://exiftool.org/exiftool_pod.html
 * Tests:
 *   - packages/vendure-server/src/features/exiftool/exiftool.service.test.ts
 */
export {
  DEFAULT_EXIFTOOL_CONFIG,
  ExifToolMetadataService,
  SUPPORTED_EXIFTOOL_EXTENSIONS,
  countMetadataFields,
  filterPreservedFields,
  hasDeviceMetadata,
  hasGpsMetadata,
} from './exiftool.service.js';
export type {
  ExifToolConfig,
  MetadataReadResult,
  MetadataResult,
} from './exiftool.types.js';
