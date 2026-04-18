/**
 * Purpose: Sanitize TipTap-rendered HTML and embed payloads in the storefront.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description, §4.5 StorePage)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://github.com/cure53/DOMPurify/blob/main/README.md
 *   - https://github.com/kkomelin/isomorphic-dompurify
 *   - https://iframely.com/docs/iframely-api
 *   - https://cavalry.studio/docs/web-player/
 * Tests:
 *   - packages/storefront/src/components/common/SanitizedContent.test.tsx
 *   - packages/storefront/src/components/TipTapEditor.test.tsx
 */
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
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeHtml(value: string): boolean {
  return value.includes('<') && value.includes('>');
}

function normalizeUrl(value: string): URL | null {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

export function sanitizeLinkUrl(value: string): string | null {
  const parsed = normalizeUrl(value);
  return parsed && ALLOWED_LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
}

export function sanitizeMediaUrl(value: string): string | null {
  const trimmed = value.trim();

  if (ALLOWED_DATA_IMAGE_PREFIX.test(trimmed)) {
    return trimmed;
  }

  const parsed = normalizeUrl(trimmed);
  return parsed && ALLOWED_MEDIA_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
}

export function sanitizeIframeUrl(value: string): string | null {
  const parsed = normalizeUrl(value);

  if (!parsed || parsed.protocol !== 'https:') {
    return null;
  }

  return ALLOWED_IFRAME_HOSTS.has(parsed.hostname) ? parsed.toString() : null;
}

export function sanitizeCavalryUrl(value: string): string | null {
  const parsed = normalizeUrl(value);

  if (!parsed || !ALLOWED_MEDIA_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  return parsed.pathname.toLowerCase().endsWith('.cv') ? parsed.toString() : null;
}

function postProcessSanitizedFragment(fragment: DocumentFragment): string {
  const elements = Array.from(fragment.querySelectorAll('*'));

  for (const element of elements) {
    for (const attributeName of element.getAttributeNames()) {
      if (attributeName.toLowerCase().startsWith('on')) {
        element.removeAttribute(attributeName);
      }
    }

    const tagName = element.localName.toLowerCase();

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

  const container = fragment.ownerDocument.createElement('div');
  container.append(fragment);
  return container.innerHTML;
}

export function sanitizeHtml(value: string): string {
  const fragment = DOMPurify.sanitize(value, DOM_PURIFY_CONFIG) as unknown as DocumentFragment;
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
          sanitized[key] = sanitizeHtml(entry);
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

        sanitized[key] = looksLikeHtml(entry) ? sanitizeHtml(entry) : entry;
        continue;
      }

      sanitized[key] = sanitizeStructuredValue(entry, key);
    }

    if (typeName === 'iframelyEmbed' && isRecord(sanitized.attrs)) {
      sanitized.attrs = {
        ...sanitized.attrs,
        html:
          typeof sanitized.attrs.html === 'string'
            ? sanitizeHtml(sanitized.attrs.html)
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

    if (typeName === 'image' && isRecord(sanitized.attrs) && typeof sanitized.attrs.src === 'string') {
      sanitized.attrs = {
        ...sanitized.attrs,
        src: sanitizeMediaUrl(sanitized.attrs.src) ?? '',
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

    return sanitizeHtml(value);
  }

  return value;
}

export function sanitizeEditorContent<T>(value: T): T {
  if (typeof value === 'string') {
    try {
      return sanitizeStructuredValue(JSON.parse(value)) as T;
    } catch {
      return sanitizeHtml(value) as T;
    }
  }

  return sanitizeStructuredValue(value) as T;
}
