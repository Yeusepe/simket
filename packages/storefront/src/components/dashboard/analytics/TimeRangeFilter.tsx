/**
 * Purpose: HeroUI button-group selector for creator analytics date range filtering.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button-group
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/TimeRangeFilter.test.tsx
 */
import { Button, ButtonGroup } from '@heroui/react';
import type { TimeRange } from './analytics-types';

interface TimeRangeFilterProps {
  readonly value: TimeRange;
  readonly onChange: (value: TimeRange) => void;
}

const TIME_RANGE_OPTIONS: readonly {
  readonly value: TimeRange;
  readonly label: string;
  readonly shortLabel: string;
}[] = [
  { value: '7d', label: 'Last 7 days', shortLabel: '7D' },
  { value: '30d', label: 'Last 30 days', shortLabel: '30D' },
  { value: '90d', label: 'Last 90 days', shortLabel: '90D' },
  { value: '1y', label: 'Last year', shortLabel: '1Y' },
  { value: 'all', label: 'All time', shortLabel: 'All' },
];

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Time range</p>
      <ButtonGroup size="sm" variant="ghost" className="flex flex-wrap">
        {TIME_RANGE_OPTIONS.map((option, index) => {
          const isSelected = option.value === value;

          return (
            <Button
              key={option.value}
              variant={isSelected ? 'secondary' : 'ghost'}
              aria-label={option.label}
              aria-pressed={isSelected}
              onPress={() => onChange(option.value)}
            >
              {index > 0 ? <ButtonGroup.Separator /> : null}
              {option.shortLabel}
            </Button>
          );
        })}
      </ButtonGroup>
    </div>
  );
}
