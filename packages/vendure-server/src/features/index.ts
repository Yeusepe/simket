/**
 * Purpose: Feature barrels exported for vendure-server integrations.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 */
export {
  initFeatureFlags,
  getFlag,
  isEnabled,
  InMemoryProvider,
} from './feature-flags.js';
export type {
  FlagConfiguration,
} from './feature-flags.js';
export {
  ClamavScannerService,
  buildQuarantineRecord,
  parseClamdResponse,
  validateClamavConfig,
} from './clamav/index.js';
export type {
  ClamavConfig,
  ClamavService,
  QuarantineRecord,
  ScanResult,
  ScanVerdict,
} from './clamav/index.js';
export {
  RedisCacheService,
  buildCacheKey,
  productCacheKey,
  searchCacheKey,
  editorialCacheKey,
  userSessionCacheKey,
} from './cache/index.js';
export type {
  CacheConfig,
  CacheEntry,
  CacheService,
  CacheKeyBuilder,
  SwrCacheEntry,
} from './cache/index.js';
export {
  DEFAULT_EXIFTOOL_CONFIG,
  ExifToolMetadataService,
  SUPPORTED_EXIFTOOL_EXTENSIONS,
  countMetadataFields,
  filterPreservedFields,
  hasDeviceMetadata,
  hasGpsMetadata,
} from './exiftool/index.js';
export type {
  ExifToolConfig,
  MetadataReadResult,
  MetadataResult,
} from './exiftool/index.js';
export {
  KeygenConfigError,
  KeygenService,
  KeygenServiceError,
  formatLicenseKey,
  isLicenseExpired,
  isValidLicenseStatus,
  isValidLicenseType,
  parseLicenseKey,
  validateKeygenConfig,
} from './keygen/index.js';
export type {
  CreateLicenseInput,
  KeygenConfig,
  License,
  LicenseStatus,
  LicenseType,
  ValidationResult,
} from './keygen/index.js';
export {
  AssetRefEntity,
  AssetRefService,
  buildAssetRefKey,
  isValidEntityType,
  isValidRefType,
} from './asset-refs/index.js';
export type {
  AssetReference,
  AssetUsageSummary,
  CreateAssetRefInput,
  EntityType,
  RefType,
} from './asset-refs/index.js';
