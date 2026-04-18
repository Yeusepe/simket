/**
 * Purpose: Keygen licensing service for issuing, validating, renewing, suspending,
 *          revoking, and listing digital-product licenses.
 * Governing docs:
 *   - docs/architecture.md (§2 Every outbound call through Cockatiel, §5 Service ownership)
 *   - docs/service-architecture.md (§1.11 Keygen)
 *   - docs/domain-model.md (§1 Core records, License)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 *   - https://keygen.sh/docs/api/errors/
 *   - https://keygen.sh/docs/api/pagination/
 *   - https://keygen.sh/docs/api/policies/
 *   - https://keygen.sh/docs/choosing-a-licensing-model/perpetual-licenses/
 *   - https://keygen.sh/docs/choosing-a-licensing-model/timed-licenses/
 *   - https://keygen.sh/docs/api/webhooks/
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 * Tests:
 *   - packages/vendure-server/src/features/keygen/keygen.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Span, type Tracer } from '@opentelemetry/api';
import {
  SERVICE_POLICIES,
  type ResiliencePolicy,
} from '../../resilience/resilience.js';
import type {
  CreateLicenseInput,
  KeygenConfig,
  License,
  LicenseStatus,
  LicenseType,
  ValidationResult,
} from './keygen.types.js';

const DEFAULT_KEYGEN_API_URL = 'https://api.keygen.sh';
const KEYGEN_MEDIA_TYPE = 'application/vnd.api+json';
const LICENSE_TYPES = new Set<LicenseType>(['perpetual', 'subscription', 'trial']);
const LICENSE_STATUSES = new Set<LicenseStatus>(['active', 'suspended', 'expired', 'revoked']);
const tracer = trace.getTracer('simket-keygen');

interface JsonApiRelationshipData {
  readonly type: string;
  readonly id: string;
}

interface JsonApiRelationship {
  readonly data?: JsonApiRelationshipData | null;
}

interface KeygenLicenseAttributes {
  readonly key?: string;
  readonly status?: string;
  readonly expiry?: string | null;
  readonly suspended?: boolean;
  readonly metadata?: Record<string, unknown> | null;
  readonly created?: string;
  readonly updated?: string;
}

interface KeygenLicenseResource {
  readonly id: string;
  readonly type: 'licenses';
  readonly attributes?: KeygenLicenseAttributes;
  readonly relationships?: {
    readonly policy?: JsonApiRelationship;
    readonly owner?: JsonApiRelationship;
    readonly product?: JsonApiRelationship;
  };
}

interface KeygenValidationMeta {
  readonly valid?: boolean;
  readonly detail?: string;
  readonly code?: string;
}

interface KeygenValidationDocument {
  readonly meta?: KeygenValidationMeta;
  readonly data?: KeygenLicenseResource;
}

interface KeygenLicenseDocument {
  readonly data?: KeygenLicenseResource;
  readonly links?: {
    readonly next?: string | null;
  };
}

interface KeygenLicenseListDocument {
  readonly data?: KeygenLicenseResource[];
  readonly links?: {
    readonly next?: string | null;
  };
}

interface KeygenErrorObject {
  readonly title?: string;
  readonly detail?: string;
  readonly code?: string;
}

interface KeygenErrorDocument {
  readonly errors?: KeygenErrorObject[];
}

interface KeygenServiceOptions {
  readonly fetch?: typeof fetch;
  readonly policy?: ResiliencePolicy;
  readonly tracer?: Tracer;
  readonly now?: () => number;
}

interface JsonRequestOptions {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly body?: Record<string, unknown>;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}

function maskLicenseKey(key: string): string {
  const normalized = parseLicenseKey(key);
  return normalized.length > 4 ? normalized.slice(-4) : normalized;
}

function createErrorMessage(prefix: string, value: string): string {
  return `${prefix} must not be empty (received "${value}")`;
}

function ensureNonEmpty(value: string, field: string, prefix: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new KeygenConfigError(createErrorMessage(`${prefix} ${field}`, value));
  }

  return trimmed;
}

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function toRelativeOrAbsoluteUrl(apiUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//iu.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${trimTrailingSlash(apiUrl)}${normalizedPath}`;
}

function normalizeStatus(resource: KeygenLicenseResource): LicenseStatus {
  if (resource.attributes?.suspended === true) {
    return 'suspended';
  }

  switch (resource.attributes?.status?.toUpperCase()) {
    case 'EXPIRED':
      return 'expired';
    case 'SUSPENDED':
      return 'suspended';
    case 'BANNED':
      return 'revoked';
    case 'ACTIVE':
    case 'INACTIVE':
    case 'EXPIRING':
    default:
      return 'active';
  }
}

function normalizeLicenseType(resource: KeygenLicenseResource): LicenseType {
  const metadata = normalizeMetadata(resource.attributes?.metadata);
  const metadataType = metadata['licenseType'];
  if (metadataType && isValidLicenseType(metadataType)) {
    return metadataType;
  }

  return resource.attributes?.expiry ? 'subscription' : 'perpetual';
}

function normalizeLicense(resource: KeygenLicenseResource): License {
  const attributes = resource.attributes ?? {};
  const metadata = normalizeMetadata(attributes.metadata);
  const key = parseLicenseKey(attributes.key ?? '');
  const policyId = resource.relationships?.policy?.data?.id ?? '';
  const userId = resource.relationships?.owner?.data?.id ?? '';
  const productId =
    resource.relationships?.product?.data?.id ?? metadata['vendureProductId'] ?? '';

  return {
    id: resource.id,
    key,
    policyId,
    userId,
    productId,
    status: normalizeStatus(resource),
    licenseType: normalizeLicenseType(resource),
    expiresAt: attributes.expiry ?? undefined,
    createdAt: attributes.created ?? attributes.updated ?? new Date(0).toISOString(),
    metadata,
  };
}

function getLastCursor(licenses: KeygenLicenseResource[]): string | undefined {
  return licenses.at(-1)?.id;
}

export function isValidLicenseType(type: string): type is LicenseType {
  return LICENSE_TYPES.has(type as LicenseType);
}

export function isValidLicenseStatus(status: string): status is LicenseStatus {
  return LICENSE_STATUSES.has(status as LicenseStatus);
}

export function isLicenseExpired(license: License): boolean {
  if (!license.expiresAt) {
    return false;
  }

  return Date.parse(license.expiresAt) < Date.now();
}

export function formatLicenseKey(key: string): string {
  const normalized = parseLicenseKey(key);
  return normalized.match(/.{1,4}/gu)?.join('-') ?? '';
}

export function parseLicenseKey(formatted: string): string {
  return formatted.replace(/[^a-z0-9]/giu, '').toUpperCase();
}

export function validateKeygenConfig(config: KeygenConfig): KeygenConfig {
  const accountId = ensureNonEmpty(config.accountId, 'accountId', 'Keygen config');
  const productToken = ensureNonEmpty(config.productToken, 'productToken', 'Keygen config');
  const apiUrl =
    config.apiUrl.trim().length > 0
      ? trimTrailingSlash(config.apiUrl)
      : DEFAULT_KEYGEN_API_URL;

  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error('apiUrl must use https');
    }
  } catch (error) {
    throw new KeygenConfigError(
      error instanceof Error ? error.message : 'Keygen config apiUrl must be a valid URL',
    );
  }

  return {
    accountId,
    productToken,
    apiUrl,
  };
}

export class KeygenServiceError extends Error {
  readonly code: string;

  readonly status?: number;

  readonly detail?: string;

  constructor(
    message: string,
    options: {
      readonly code?: string;
      readonly status?: number;
      readonly detail?: string;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'KeygenServiceError';
    this.code = options.code ?? 'KEYGEN_ERROR';
    this.status = options.status;
    this.detail = options.detail;
  }
}

export class KeygenConfigError extends KeygenServiceError {
  constructor(message: string) {
    super(message, {
      code: 'KEYGEN_CONFIG_INVALID',
      status: 500,
      detail: message,
    });
    this.name = 'KeygenConfigError';
  }
}

@Injectable()
export class KeygenService {
  private readonly config: KeygenConfig;

  private readonly fetchImpl: typeof fetch;

  private readonly policy: ResiliencePolicy;

  private readonly tracer: Tracer;

  private readonly now: () => number;

  constructor(config: KeygenConfig, options: KeygenServiceOptions = {}) {
    this.config = validateKeygenConfig(config);
    this.fetchImpl = options.fetch ?? fetch;
    this.policy = options.policy ?? SERVICE_POLICIES.keygen;
    this.tracer = options.tracer ?? tracer;
    this.now = options.now ?? (() => Date.now());
  }

  async createLicense(input: CreateLicenseInput): Promise<License> {
    this.validateCreateLicenseInput(input);

    return this.tracer.startActiveSpan('keygen.createLicense', async (span) => {
      try {
        span.setAttribute('keygen.policy_id', input.policyId);
        span.setAttribute('keygen.user_id', input.userId);
        span.setAttribute('keygen.product_id', input.productId);
        span.setAttribute('keygen.license_type', input.licenseType);

        const document = await this.requestJson<KeygenLicenseDocument>({
          method: 'POST',
          path: `/v1/accounts/${this.config.accountId}/licenses`,
          body: {
            data: {
              type: 'licenses',
              attributes: {
                metadata: {
                  licenseType: input.licenseType,
                  vendureProductId: input.productId,
                  ...(input.metadata ?? {}),
                },
              },
              relationships: {
                policy: {
                  data: {
                    type: 'policies',
                    id: input.policyId,
                  },
                },
                owner: {
                  data: {
                    type: 'users',
                    id: input.userId,
                  },
                },
              },
            },
          },
        });

        const resource = document.data;
        if (!resource) {
          throw new KeygenServiceError('Keygen create license response did not include data', {
            code: 'KEYGEN_LICENSE_CREATE_EMPTY',
          });
        }

        const license = normalizeLicense(resource);
        if (license.productId !== input.productId) {
          throw new KeygenServiceError(
            'Keygen policy product did not match the requested product',
            {
              code: 'KEYGEN_PRODUCT_MISMATCH',
              detail: `Expected ${input.productId} but received ${license.productId || 'empty'}`,
            },
          );
        }

        span.setAttribute('keygen.license_id', license.id);
        span.setAttribute('keygen.license_key_last4', maskLicenseKey(license.key));
        span.setAttribute('keygen.license_status', license.status);
        return license;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async validateLicense(key: string): Promise<ValidationResult> {
    const normalizedKey = parseLicenseKey(key);
    if (normalizedKey.length === 0) {
      throw new KeygenServiceError('validateLicense key must not be empty', {
        code: 'KEYGEN_LICENSE_KEY_REQUIRED',
      });
    }

    return this.tracer.startActiveSpan('keygen.validateLicense', async (span) => {
      try {
        span.setAttribute('keygen.license_key_last4', maskLicenseKey(normalizedKey));

        const document = await this.requestJson<KeygenValidationDocument>({
          method: 'POST',
          path: `/v1/accounts/${this.config.accountId}/licenses/actions/validate-key`,
          body: {
            meta: {
              key: normalizedKey,
            },
          },
        });

        const result: ValidationResult = {
          valid: document.meta?.valid === true,
          detail: document.meta?.detail ?? 'Unknown validation result',
          code: document.meta?.code ?? 'UNKNOWN',
          licenseId: document.data?.id,
        };

        span.setAttribute('keygen.validation_valid', result.valid);
        span.setAttribute('keygen.validation_code', result.code);
        if (document.data) {
          span.setAttribute('keygen.license_status', normalizeLicense(document.data).status);
        }

        return result;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async suspendLicense(licenseId: string): Promise<License> {
    const normalizedId = this.requireIdentifier(licenseId, 'suspendLicense licenseId');

    return this.tracer.startActiveSpan('keygen.suspendLicense', async (span) => {
      try {
        span.setAttribute('keygen.license_id', normalizedId);

        const document = await this.requestJson<KeygenLicenseDocument>({
          method: 'POST',
          path: `/v1/accounts/${this.config.accountId}/licenses/${normalizedId}/actions/suspend`,
        });

        const resource = document.data;
        if (!resource) {
          throw new KeygenServiceError('Keygen suspend response did not include data', {
            code: 'KEYGEN_LICENSE_SUSPEND_EMPTY',
          });
        }

        const license = normalizeLicense(resource);
        span.setAttribute('keygen.license_status', license.status);
        return license;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async revokeLicense(licenseId: string): Promise<License> {
    const normalizedId = this.requireIdentifier(licenseId, 'revokeLicense licenseId');

    return this.tracer.startActiveSpan('keygen.revokeLicense', async (span) => {
      try {
        span.setAttribute('keygen.license_id', normalizedId);

        const existing = await this.getLicenseById(normalizedId);
        await this.requestVoid({
          method: 'DELETE',
          path: `/v1/accounts/${this.config.accountId}/licenses/${normalizedId}/actions/revoke`,
        });

        const revoked: License = {
          ...existing,
          status: 'revoked',
        };
        span.setAttribute('keygen.license_status', revoked.status);
        return revoked;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async renewLicense(licenseId: string, duration?: number): Promise<License> {
    const normalizedId = this.requireIdentifier(licenseId, 'renewLicense licenseId');

    if (duration !== undefined && (!Number.isSafeInteger(duration) || duration <= 0)) {
      throw new KeygenServiceError('renewLicense duration must be a positive integer (seconds)', {
        code: 'KEYGEN_RENEW_DURATION_INVALID',
      });
    }

    return this.tracer.startActiveSpan('keygen.renewLicense', async (span) => {
      try {
        span.setAttribute('keygen.license_id', normalizedId);
        if (duration !== undefined) {
          span.setAttribute('keygen.renew_duration_seconds', duration);
        }

        const license =
          duration === undefined
            ? await this.renewByAction(normalizedId)
            : await this.renewByExpiryUpdate(normalizedId, duration);

        span.setAttribute('keygen.license_status', license.status);
        if (license.expiresAt) {
          span.setAttribute('keygen.license_expiry', license.expiresAt);
        }
        return license;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getLicensesForUser(userId: string): Promise<License[]> {
    const normalizedUserId = this.requireIdentifier(userId, 'getLicensesForUser userId');

    return this.tracer.startActiveSpan('keygen.getLicensesForUser', async (span) => {
      try {
        span.setAttribute('keygen.user_id', normalizedUserId);
        const licenses = await this.listLicenses({ owner: normalizedUserId });
        span.setAttribute('keygen.license_count', licenses.length);
        return licenses;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getLicensesForProduct(productId: string): Promise<License[]> {
    const normalizedProductId = this.requireIdentifier(
      productId,
      'getLicensesForProduct productId',
    );

    return this.tracer.startActiveSpan('keygen.getLicensesForProduct', async (span) => {
      try {
        span.setAttribute('keygen.product_id', normalizedProductId);
        const licenses = await this.listLicenses({ product: normalizedProductId });
        span.setAttribute('keygen.license_count', licenses.length);
        return licenses;
      } catch (error) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async renewByAction(licenseId: string): Promise<License> {
    const document = await this.requestJson<KeygenLicenseDocument>({
      method: 'POST',
      path: `/v1/accounts/${this.config.accountId}/licenses/${licenseId}/actions/renew`,
    });

    if (!document.data) {
      throw new KeygenServiceError('Keygen renew response did not include data', {
        code: 'KEYGEN_LICENSE_RENEW_EMPTY',
      });
    }

    return normalizeLicense(document.data);
  }

  private async renewByExpiryUpdate(licenseId: string, duration: number): Promise<License> {
    const existing = await this.getLicenseById(licenseId);
    const baseline = existing.expiresAt
      ? Math.max(Date.parse(existing.expiresAt), this.now())
      : this.now();
    const nextExpiry = new Date(baseline + duration * 1_000).toISOString();

    const document = await this.requestJson<KeygenLicenseDocument>({
      method: 'PATCH',
      path: `/v1/accounts/${this.config.accountId}/licenses/${licenseId}`,
      body: {
        data: {
          type: 'licenses',
          attributes: {
            expiry: nextExpiry,
          },
        },
      },
    });

    if (!document.data) {
      throw new KeygenServiceError('Keygen renew update response did not include data', {
        code: 'KEYGEN_LICENSE_RENEW_UPDATE_EMPTY',
      });
    }

    return normalizeLicense(document.data);
  }

  private async getLicenseById(licenseId: string): Promise<License> {
    const document = await this.requestJson<KeygenLicenseDocument>({
      method: 'GET',
      path: `/v1/accounts/${this.config.accountId}/licenses/${licenseId}`,
    });

    if (!document.data) {
      throw new KeygenServiceError('Keygen license lookup response did not include data', {
        code: 'KEYGEN_LICENSE_LOOKUP_EMPTY',
      });
    }

    return normalizeLicense(document.data);
  }

  private async listLicenses(filters: Record<string, string>): Promise<License[]> {
    const licenses: License[] = [];
    let nextPath: string | undefined = this.buildListPath(filters);

    while (nextPath) {
      const document: KeygenLicenseListDocument = await this.requestJson<KeygenLicenseListDocument>({
        method: 'GET',
        path: nextPath,
      });
      const resources = document.data ?? [];
      licenses.push(
        ...resources.map((resource: KeygenLicenseResource) => normalizeLicense(resource)),
      );

      const nextLink: string | null | undefined = document.links?.next;
      if (nextLink) {
        nextPath = nextLink;
        continue;
      }

      const cursor = getLastCursor(resources);
      nextPath =
        resources.length === 100 && cursor
          ? this.buildListPath(filters, cursor)
          : undefined;
    }

    return licenses;
  }

  private buildListPath(filters: Record<string, string>, cursor = ''): string {
    const params = new URLSearchParams();
    params.set('page[size]', '100');
    params.set('page[cursor]', cursor);

    for (const [key, value] of Object.entries(filters)) {
      params.set(key, value);
    }

    return `/v1/accounts/${this.config.accountId}/licenses?${params.toString()}`;
  }

  private async requestJson<T>(options: JsonRequestOptions): Promise<T> {
    const url = toRelativeOrAbsoluteUrl(this.config.apiUrl, options.path);

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await this.policy.execute(() =>
        this.fetchImpl(url, {
          method: options.method,
          headers: {
            Accept: KEYGEN_MEDIA_TYPE,
            Authorization: `Bearer ${this.config.productToken}`,
            ...(options.body ? { 'Content-Type': KEYGEN_MEDIA_TYPE } : {}),
          },
          ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        }),
      );
    } catch (error) {
      throw new KeygenServiceError('Keygen request failed', {
        code: 'KEYGEN_REQUEST_FAILED',
        cause: error,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      throw await this.buildApiError(response);
    }

    return (await response.json()) as T;
  }

  private async requestVoid(options: JsonRequestOptions): Promise<void> {
    const url = toRelativeOrAbsoluteUrl(this.config.apiUrl, options.path);

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await this.policy.execute(() =>
        this.fetchImpl(url, {
          method: options.method,
          headers: {
            Accept: KEYGEN_MEDIA_TYPE,
            Authorization: `Bearer ${this.config.productToken}`,
            ...(options.body ? { 'Content-Type': KEYGEN_MEDIA_TYPE } : {}),
          },
          ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        }),
      );
    } catch (error) {
      throw new KeygenServiceError('Keygen request failed', {
        code: 'KEYGEN_REQUEST_FAILED',
        cause: error,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      throw await this.buildApiError(response);
    }
  }

  private async buildApiError(
    response: Awaited<ReturnType<typeof fetch>>,
  ): Promise<KeygenServiceError> {
    let payload: KeygenErrorDocument | undefined;
    try {
      payload = (await response.json()) as KeygenErrorDocument;
    } catch {
      payload = undefined;
    }

    const firstError = payload?.errors?.[0];
    return new KeygenServiceError(
      firstError?.title ?? `Keygen request failed with status ${response.status}`,
      {
        code: firstError?.code ?? 'KEYGEN_API_ERROR',
        status: response.status,
        detail: firstError?.detail,
      },
    );
  }

  private validateCreateLicenseInput(input: CreateLicenseInput): void {
    if (!input.policyId || input.policyId.trim().length === 0) {
      throw new KeygenServiceError('createLicense policyId must not be empty', {
        code: 'KEYGEN_POLICY_ID_REQUIRED',
      });
    }
    if (!input.userId || input.userId.trim().length === 0) {
      throw new KeygenServiceError('createLicense userId must not be empty', {
        code: 'KEYGEN_USER_ID_REQUIRED',
      });
    }
    if (!input.productId || input.productId.trim().length === 0) {
      throw new KeygenServiceError('createLicense productId must not be empty', {
        code: 'KEYGEN_PRODUCT_ID_REQUIRED',
      });
    }
    if (!isValidLicenseType(input.licenseType)) {
      throw new KeygenServiceError(
        `createLicense licenseType must be one of ${Array.from(LICENSE_TYPES).join(', ')}`,
        {
          code: 'KEYGEN_LICENSE_TYPE_INVALID',
        },
      );
    }
  }

  private requireIdentifier(value: string, field: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new KeygenServiceError(`${field} must not be empty`, {
        code: 'KEYGEN_IDENTIFIER_REQUIRED',
      });
    }

    return trimmed;
  }

  private recordError(span: Span, error: unknown): void {
    if (error instanceof KeygenServiceError) {
      span.setAttribute('keygen.error_code', error.code);
      if (error.status !== undefined) {
        span.setAttribute('keygen.http_status', error.status);
      }
      if (error.detail) {
        span.setAttribute('keygen.error_detail', error.detail);
      }
    }

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
