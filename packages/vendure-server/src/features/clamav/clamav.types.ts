/**
 * Purpose: ClamAV feature contracts for clamd-backed malware scanning.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.clamav.net/manual/Usage/Scanning.html
 *   - https://manpages.debian.org/testing/clamav-daemon/clamd.8.en.html
 * Tests:
 *   - packages/vendure-server/src/features/clamav/clamav.service.test.ts
 */
export interface ClamavConfig {
  readonly host: string;
  readonly port: number;
  readonly timeout: number;
  readonly maxFileSize: number;
}

export type ScanVerdict = 'clean' | 'infected' | 'error';

export interface ScanResult {
  readonly verdict: ScanVerdict;
  readonly filename: string;
  readonly fileSize: number;
  readonly scannedAt: string;
  readonly threat?: string;
  readonly error?: string;
  readonly durationMs: number;
}

export interface ClamavService {
  scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult>;
  scanStream(stream: NodeJS.ReadableStream, filename: string): Promise<ScanResult>;
  ping(): Promise<boolean>;
  version(): Promise<string>;
}

export interface QuarantineRecord {
  readonly filename: string;
  readonly threat: string;
  readonly scannedAt: string;
  readonly fileSize: number;
  readonly quarantineId: string;
}
