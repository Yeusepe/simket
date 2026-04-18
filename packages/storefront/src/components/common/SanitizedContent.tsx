/**
 * Purpose: Render sanitized HTML fragments for TipTap read-only content and embeds.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description, §4.5 StorePage)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://github.com/cure53/DOMPurify/blob/main/README.md
 *   - https://github.com/kkomelin/isomorphic-dompurify
 * Tests:
 *   - packages/storefront/src/components/common/SanitizedContent.test.tsx
 */
import { useMemo } from 'react';
import { sanitizeHtml } from '../../sanitization/html-sanitizer';

export interface SanitizedContentProps {
  readonly html: string;
  readonly className?: string;
}

export function useSanitizedHtml(html: string): string {
  return useMemo(() => sanitizeHtml(html), [html]);
}

export function SanitizedContent({ html, className }: SanitizedContentProps) {
  const sanitizedHtml = useSanitizedHtml(html);

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
