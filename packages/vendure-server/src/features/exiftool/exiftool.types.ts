/**
 * Purpose: Contracts for ExifTool-backed metadata inspection and stripping.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, §6 lifecycle flows)
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
export interface ExifToolConfig {
  readonly maxProcs: number;
  readonly taskTimeoutMs: number;
  readonly preserveFields: readonly string[];
}

export interface MetadataResult {
  readonly filename: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly hasGpsData: boolean;
  readonly hasDeviceInfo: boolean;
  readonly fieldCount: number;
  readonly strippedFieldCount: number;
  readonly preservedFields: Record<string, string>;
  readonly durationMs: number;
}

export interface MetadataReadResult {
  readonly filename: string;
  readonly fields: Record<string, unknown>;
  readonly hasGpsData: boolean;
  readonly hasDeviceInfo: boolean;
}
