/**
 * Purpose: Sanitize user-provided HTML and serialized TipTap/store-page content before persistence.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §2 fail-closed security)
 *   - docs/service-architecture.md (§1.1 Vendure Bebop gateway)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://github.com/cure53/DOMPurify/blob/main/README.md
 *   - https://github.com/kkomelin/isomorphic-dompurify
 *   - https://iframely.com/docs/iframely-api
 *   - https://cavalry.studio/docs/web-player/
 * Tests:
 *   - packages/vendure-server/src/sanitization/sanitization.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

const SANITIZED_LINK_REL = 'noopener noreferrer nofollow';
const ALLOWED_IFRAME_HOSTS = new Set([
  'cdn.iframe.ly',
  'iframe.ly',
  'iframely.net',
  'player.vimeo.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'w.soundcloud.com',
]);
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ALLOWED_MEDIA_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_DATA_IMAGE_PREFIX = /^data:image\/(?:png|apng|avif|gif|jpeg|jpg|webp);/i;
const CAVALRY_ATTRIBUTES = new Set(['src', 'width', 'height', 'autoplay', 'loop', 'controls']);
const DOM_PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe'],
  ADD_ATTR: [
    'allow',
    'allowfullscreen',
    'frameborder',
    'loading',
    'referrerpolicy',
    'sandbox',
    'scrolling',
    'target',
  ],
  FORBID_TAGS: ['script', 'style'],
  FORBID_ATTR: ['style'],
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: (tagName: string) => tagName === 'cavalry-player',
    attributeNameCheck: (attributeName: string, tagName?: string) =>
      tagName === 'cavalry-player' && CAVALRY_ATTRIBUTES.has(attributeName),
    allowCustomizedBuiltInElements: false,
  },
  RETURN_DOM_FRAGMENT: true,
};

interface MutableElement {
  readonly localName?: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  remove(): void;
  getAttributeNames(): string[];
}

interface MutableDocumentFragment {
  ownerDocument?: {
    createElement(tagName: string): {
      append(...nodes: unknown[]): void;
      innerHTML: string;
    };
  };
  querySelectorAll(selectors: string): ArrayLike<MutableElement>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeHtml(value: string): boolean {
  return value.includes('<') && value.includes('>');
}

function tryParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeUrl(value: string): URL | null {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function sanitizeLinkUrl(value: string): string | null {
  const parsed = normalizeUrl(value);
  return parsed && ALLOWED_LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
}

function sanitizeMediaUrl(value: string): string | null {
  const trimmed = value.trim();

  if (ALLOWED_DATA_IMAGE_PREFIX.test(trimmed)) {
    return trimmed;
  }

  const parsed = normalizeUrl(trimmed);
  return parsed && ALLOWED_MEDIA_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
}

function sanitizeIframeUrl(value: string): string | null {
  const parsed = normalizeUrl(value);

  if (!parsed || parsed.protocol !== 'https:') {
    return null;
  }

  return ALLOWED_IFRAME_HOSTS.has(parsed.hostname) ? parsed.toString() : null;
}

function sanitizeCavalryUrl(value: string): string | null {
  const parsed = normalizeUrl(value);

  if (!parsed || !ALLOWED_MEDIA_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  return parsed.pathname.toLowerCase().endsWith('.cv') ? parsed.toString() : null;
}

function postProcessSanitizedFragment(fragment: MutableDocumentFragment): string {
  const elements = Array.from(fragment.querySelectorAll('*'));

  for (const element of elements) {
    for (const attributeName of element.getAttributeNames()) {
      if (attributeName.toLowerCase().startsWith('on')) {
        element.removeAttribute(attributeName);
      }
    }

    const tagName = element.localName?.toLowerCase() ?? '';

    if (tagName === 'a') {
      const href = element.getAttribute('href');
      const sanitizedHref = href ? sanitizeLinkUrl(href) : null;

      if (sanitizedHref) {
        element.setAttribute('href', sanitizedHref);
        element.setAttribute('rel', SANITIZED_LINK_REL);
      } else {
        element.removeAttribute('href');
      }
    }

    if (tagName === 'img') {
      const src = element.getAttribute('src');
      const sanitizedSrc = src ? sanitizeMediaUrl(src) : null;

      if (sanitizedSrc) {
        element.setAttribute('src', sanitizedSrc);
      } else {
        element.remove();
        continue;
      }
    }

    if (tagName === 'iframe') {
      const src = element.getAttribute('src');
      const sanitizedSrc = src ? sanitizeIframeUrl(src) : null;

      if (!sanitizedSrc) {
        element.remove();
        continue;
      }

      element.setAttribute('src', sanitizedSrc);
      if (!element.getAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
      if (!element.getAttribute('referrerpolicy')) {
        element.setAttribute('referrerpolicy', 'no-referrer');
      }
    }

    if (tagName === 'cavalry-player') {
      const src = element.getAttribute('src');
      const sanitizedSrc = src ? sanitizeCavalryUrl(src) : null;

      if (!sanitizedSrc) {
        element.remove();
        continue;
      }

      element.setAttribute('src', sanitizedSrc);
    }
  }

  const container = fragment.ownerDocument?.createElement('div');
  if (!container) {
    return '';
  }

  container.append(fragment);
  return container.innerHTML;
}

function sanitizeHtmlInternal(value: string): string {
  const fragment = DOMPurify.sanitize(value, DOM_PURIFY_CONFIG) as unknown as MutableDocumentFragment;
  return postProcessSanitizedFragment(fragment);
}

function sanitizeStructuredValue(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeStructuredValue(entry, parentKey));
  }

  if (isRecord(value)) {
    const typeName = typeof value.type === 'string' ? value.type : undefined;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'string') {
        if (key === 'html' || (key === 'content' && looksLikeHtml(entry))) {
          sanitized[key] = sanitizeHtmlInternal(entry);
          continue;
        }

        if (key === 'href') {
          sanitized[key] = sanitizeLinkUrl(entry) ?? '';
          continue;
        }

        if (key === 'src') {
          sanitized[key] =
            typeName === 'cavalryEmbed'
              ? sanitizeCavalryUrl(entry) ?? ''
              : sanitizeMediaUrl(entry) ?? '';
          continue;
        }

        if (key === 'url') {
          sanitized[key] = sanitizeLinkUrl(entry) ?? '';
          continue;
        }

        sanitized[key] = looksLikeHtml(entry) ? sanitizeHtmlInternal(entry) : entry;
        continue;
      }

      sanitized[key] = sanitizeStructuredValue(entry, key);
    }

    if (typeName === 'image' && isRecord(sanitized.attrs) && typeof sanitized.attrs.src === 'string') {
      sanitized.attrs = {
        ...sanitized.attrs,
        src: sanitizeMediaUrl(sanitized.attrs.src) ?? '',
      };
    }

    if (typeName === 'iframelyEmbed' && isRecord(sanitized.attrs)) {
      sanitized.attrs = {
        ...sanitized.attrs,
        html:
          typeof sanitized.attrs.html === 'string'
            ? sanitizeHtmlInternal(sanitized.attrs.html)
            : sanitized.attrs.html,
        url:
          typeof sanitized.attrs.url === 'string'
            ? sanitizeLinkUrl(sanitized.attrs.url) ?? ''
            : sanitized.attrs.url,
      };
    }

    if (typeName === 'cavalryEmbed' && isRecord(sanitized.attrs) && typeof sanitized.attrs.src === 'string') {
      sanitized.attrs = {
        ...sanitized.attrs,
        src: sanitizeCavalryUrl(sanitized.attrs.src) ?? '',
      };
    }

    return sanitized;
  }

  if (typeof value === 'string' && looksLikeHtml(value)) {
    if (parentKey === 'href') {
      return sanitizeLinkUrl(value) ?? '';
    }

    if (parentKey === 'src') {
      return sanitizeMediaUrl(value) ?? '';
    }

    return sanitizeHtmlInternal(value);
  }

  return value;
}

export function sanitizeHtml(value: string): string {
  return sanitizeHtmlInternal(value);
}

export function sanitizeRichTextValue(value: string): string {
  const parsed = tryParseJson(value);

  if (parsed === undefined) {
    return sanitizeHtmlInternal(value);
  }

  return JSON.stringify(sanitizeStructuredValue(parsed));
}

export function sanitizeStorePageContentValue(value: string): string {
  const parsed = tryParseJson(value);

  if (parsed === undefined) {
    return sanitizeHtmlInternal(value);
  }

  return JSON.stringify(sanitizeStructuredValue(parsed));
}

@Injectable()
export class SanitizationService {
  sanitizeHtml(value: string): string {
    return sanitizeHtmlInternal(value);
  }

  sanitizeRichText(value: string): string {
    return sanitizeRichTextValue(value);
  }

  sanitizeStorePageContent(value: string): string {
    return sanitizeStorePageContentValue(value);
  }

  sanitizeProductCustomFields(
    customFields: Record<string, unknown> | undefined,
  ): { readonly changed: boolean; readonly customFields: Record<string, unknown> | undefined } {
    if (!customFields) {
      return { changed: false, customFields };
    }

    let changed = false;
    const sanitizedFields = { ...customFields };

    for (const fieldName of ['tiptapDescription', 'termsOfService']) {
      const currentValue = sanitizedFields[fieldName];

      if (typeof currentValue !== 'string') {
        continue;
      }

      const sanitizedValue = sanitizeRichTextValue(currentValue);
      if (sanitizedValue !== currentValue) {
        sanitizedFields[fieldName] = sanitizedValue;
        changed = true;
      }
    }

    return { changed, customFields: sanitizedFields };
  }
}
