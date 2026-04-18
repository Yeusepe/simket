/**
 * Purpose: HTML embed sanitization — strips XSS vectors, validates iframe domains,
 * enforces sandbox attributes on allowed embeds.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 *   - https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
 * Tests:
 *   - src/plugins/html-sanitize/html-sanitize.service.test.ts
 */

/**
 * Allowed embed domains for iframe content. Only these domains may serve
 * embedded content inside product descriptions and post-sale pages.
 */
export const ALLOWED_EMBED_DOMAINS: readonly string[] = [
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'vimeo.com',
  'platform.twitter.com',
  'twitter.com',
  'x.com',
  'gist.github.com',
  'github.com',
  'codepen.io',
  'codesandbox.io',
  'open.spotify.com',
  'embed.spotify.com',
  'soundcloud.com',
  'w.soundcloud.com',
  'bandcamp.com',
  'sketchfab.com',
  'cavalry.studio',
];

const DANGEROUS_TAG_PATTERN = /<\s*\/?\s*(script|style|link|meta|object|embed|applet|form|input|textarea|select|button)\b[^>]*>/gi;

const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;

const JAVASCRIPT_PROTOCOL_PATTERN = /(?:href|src|action)\s*=\s*["']?\s*javascript\s*:/gi;

const DATA_PROTOCOL_PATTERN = /(?:src|href)\s*=\s*["']?\s*data\s*:\s*(?:text\/html|application)/gi;

/**
 * Sanitizes arbitrary HTML by stripping dangerous tags, event handlers,
 * and protocol handlers. Preserves safe structural/formatting tags.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let result = html;

  // Strip content between script and style tags (must come before tag stripping)
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strip dangerous tags (script, style, link, meta, object, embed, etc.)
  result = result.replace(DANGEROUS_TAG_PATTERN, '');

  // Strip event handler attributes
  result = result.replace(EVENT_HANDLER_PATTERN, '');

  // Strip javascript: protocol in href/src
  result = result.replace(JAVASCRIPT_PROTOCOL_PATTERN, '');

  // Strip data: protocol for dangerous MIME types
  result = result.replace(DATA_PROTOCOL_PATTERN, '');

  return result.trim();
}

/**
 * Sanitizes iframe embeds. Only iframes with `src` pointing to allowed domains
 * are kept. All others are stripped entirely. Allowed iframes get a sandbox attribute.
 */
export function sanitizeIframeEmbed(iframeHtml: string): string {
  if (!iframeHtml) return '';

  const srcMatch = iframeHtml.match(/src\s*=\s*["']([^"']+)["']/i);
  if (!srcMatch || !srcMatch[1]) return '';

  const src = srcMatch[1];

  if (!isAllowedEmbedDomain(src)) {
    return '';
  }

  // Strip event handlers from the iframe tag
  let sanitized = iframeHtml.replace(EVENT_HANDLER_PATTERN, '');

  // Ensure sandbox attribute exists with safe values
  if (!sanitized.includes('sandbox=')) {
    sanitized = sanitized.replace(
      /(<iframe\b[^>]*)(>)/i,
      '$1 sandbox="allow-scripts allow-same-origin"$2',
    );
  }

  return sanitized;
}

/**
 * Checks if a URL points to an allowed embed domain.
 */
export function isAllowedEmbedDomain(url: string): boolean {
  try {
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      return false;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return ALLOWED_EMBED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

/**
 * Strips dangerous attributes (event handlers, style) from an attribute map.
 * Returns a new object with only safe attributes.
 */
export function stripDangerousAttributes(
  attrs: Record<string, string>,
): Record<string, string> {
  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(attrs)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('on')) continue;
    if (lowerKey === 'style') continue;
    safe[key] = value;
  }

  return safe;
}
