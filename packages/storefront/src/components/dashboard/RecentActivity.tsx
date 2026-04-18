/**
 * Purpose: Card-based recent activity feed for creator sales, reviews, collaborations, and product changes.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
 * Tests:
 *   - packages/storefront/src/components/dashboard/RecentActivity.test.tsx
 */
import { Card, Link } from '@heroui/react';
import type { ActivityItem } from './dashboard-types';

interface RecentActivityProps {
  readonly items: readonly ActivityItem[];
}

const ACTIVITY_ICONS: Record<ActivityItem['type'], string> = {
  sale: '💸',
  review: '⭐',
  collaboration: '🤝',
  product_update: '📝',
};

function formatRelativeTimestamp(timestamp: string): string {
  const eventTime = new Date(timestamp).getTime();
  const diffInSeconds = Math.round((eventTime - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

  const relativeUnits: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, secondsPerUnit] of relativeUnits) {
    if (Math.abs(diffInSeconds) >= secondsPerUnit) {
      return formatter.format(Math.round(diffInSeconds / secondsPerUnit), unit);
    }
  }

  return 'just now';
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="h-full">
      <Card.Header className="items-center justify-between gap-4">
        <div className="space-y-1">
          <Card.Title>Recent Activity</Card.Title>
          <Card.Description>Stay on top of the latest creator dashboard changes.</Card.Description>
        </div>
        <Link href="/dashboard/activity" className="text-sm font-medium">
          View all activity
        </Link>
      </Card.Header>
      <Card.Content>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/60 text-lg"
                >
                  {ACTIVITY_ICONS[item.type]}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
