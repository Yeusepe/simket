/**
 * Purpose: Collaboration earnings breakdown chart for creator dashboard settlement visibility.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4.1 Settlement)
 * External references:
 *   - https://recharts.github.io/
 *   - packages/storefront/node_modules/recharts/types/index.d.ts
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationEarnings.test.tsx
 */
import { Card } from '@heroui/react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { CollaborationEarningsPoint } from './collab-types';
import { formatCurrency } from './collaboration-utils';

interface CollaborationEarningsProps {
  readonly history: readonly CollaborationEarningsPoint[];
}

export function CollaborationEarnings({ history }: CollaborationEarningsProps) {
  return (
    <Card variant="transparent">
      <Card.Header className="space-y-1 px-0">
        <Card.Title>Earnings breakdown</Card.Title>
        <Card.Description>Available earnings and pending settlements per payout period.</Card.Description>
      </Card.Header>
      <Card.Content className="px-0">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No earnings have been recorded for this collaboration yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <BarChart
              accessibilityLayer
              aria-label="Collaboration earnings breakdown chart"
              data={history}
              height={260}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
              role="img"
              width={720}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" minTickGap={24} />
              <YAxis tickFormatter={(value) => formatCurrency(Number(value ?? 0))} width={88} />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  name === 'earnedCents' ? 'Available' : 'Pending',
                ]}
              />
              <Bar dataKey="earnedCents" fill="#0ea5e9" name="earnedCents" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pendingCents" fill="#f59e0b" name="pendingCents" radius={[8, 8, 0, 0]} />
            </BarChart>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
