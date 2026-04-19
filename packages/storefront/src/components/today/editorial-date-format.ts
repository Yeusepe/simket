/**
 * Purpose: Shared date string for editorial card metadata lines.
 */
export function formatEditorialCardDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}
