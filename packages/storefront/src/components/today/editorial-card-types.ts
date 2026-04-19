/**
 * Purpose: Props for editorial card variants (split default vs compact grid).
 */
import type { EditorialItem } from './today-types';

/** Hover / focus shell shared by split and compact editorial cards. */
export const EDITORIAL_CARD_SHELL_CLASSNAME =
  'h-full min-h-0 overflow-hidden transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary' as const;

export interface EditorialCardProps {
  readonly item: EditorialItem;
  /** `small` = square tile (bento picks); `medium` = roomier type; `default` = split square hero + solid footer. */
  readonly size?: 'default' | 'small' | 'medium';
}
