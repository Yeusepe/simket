/**
 * Purpose: Generic split layout — square media on top, footer region below — for
 * cards (editorial, listings) without baking in domain-specific markup.
 * Governing docs:
 *   - docs/architecture.md
 */
import type { ReactNode } from 'react';

export interface SplitMediaCardProps {
  readonly media: ReactNode;
  readonly footer: ReactNode;
  readonly className?: string;
  /** Applied to the footer column (e.g. solid surface + padding). */
  readonly footerClassName?: string;
}

/**
 * Media is always **square** (`aspect-square`) so thumbnails stay consistent in
 * carousels and grids; footer flexes for title, meta, and actions.
 */
export function SplitMediaCard({ media, footer, className, footerClassName }: SplitMediaCardProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className ?? ''}`}>
      <div className="aspect-square w-full shrink-0 overflow-hidden bg-content2">{media}</div>
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${footerClassName ?? ''}`}>{footer}</div>
    </div>
  );
}
