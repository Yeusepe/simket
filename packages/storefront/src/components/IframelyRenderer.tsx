/**
 * Purpose: Render read-only iFramely embed HTML in the storefront.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://iframely.com/docs/iframely-api
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/IframelyRenderer.test.tsx
 */
import { SanitizedContent } from './common/SanitizedContent';

export interface IframelyRendererProps {
  html: string;
  title?: string;
  url: string;
}

export function IframelyRenderer({
  html,
  title,
  url,
}: IframelyRendererProps) {
  return (
    <div className="iframely-renderer overflow-hidden rounded-xl border border-default-200 bg-content1 p-4">
      {html ? (
        <SanitizedContent html={html} />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary underline"
        >
          {title ?? url}
        </a>
      )}
    </div>
  );
}
