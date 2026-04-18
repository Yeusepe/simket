/**
 * Purpose: Validate embed URLs and normalize iFramely API responses.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/service-architecture.md (§1 service surfaces)
 * External references:
 *   - https://iframely.com/docs/iframely-api
 *   - https://iframely.com/docs/parameters
 * Tests:
 *   - packages/storefront/src/services/iframely-service.test.ts
 */
export interface IframelyResult {
  html: string;
  providerName: string;
  thumbnailUrl: string | null;
  title: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getThumbnailHref(links: unknown): string | null {
  if (!isRecord(links)) {
    return null;
  }

  const thumbnail = links.thumbnail;

  if (Array.isArray(thumbnail)) {
    return thumbnail
      .map((entry) => (isRecord(entry) ? getNonEmptyString(entry.href) : null))
      .find((entry): entry is string => entry !== null) ?? null;
  }

  if (isRecord(thumbnail)) {
    return getNonEmptyString(thumbnail.href);
  }

  return null;
}

export function isEmbeddableUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildIframelyApiUrl(url: string, apiKey: string): string {
  const apiUrl = new URL('https://cdn.iframe.ly/api/iframely');

  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('iframe', '1');
  apiUrl.searchParams.set('omit_script', '1');

  return apiUrl.toString();
}

export function parseIframelyResponse(response: unknown): IframelyResult | null {
  if (!isRecord(response)) {
    return null;
  }

  const html = getNonEmptyString(response.html);

  if (!html) {
    return null;
  }

  const meta = isRecord(response.meta) ? response.meta : null;
  const title =
    getNonEmptyString(response.title) ?? getNonEmptyString(meta?.title) ?? '';
  const providerName =
    getNonEmptyString(response.provider_name) ??
    getNonEmptyString(meta?.provider_name) ??
    getNonEmptyString(meta?.site) ??
    '';
  const thumbnailUrl =
    getNonEmptyString(response.thumbnail_url) ?? getThumbnailHref(response.links);

  return {
    html,
    title,
    thumbnailUrl,
    providerName,
  };
}
