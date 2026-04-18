/**
 * Purpose: Render creator experiments with status badges and quick summary details.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/badge
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentList.test.tsx
 */
import { Badge, Button, Card } from '@heroui/react';
import type { ExperimentRecord } from './experiment-types';

function formatAudienceLabel(experiment: ExperimentRecord): string {
  if (experiment.audienceRules.mode === 'segment' && experiment.audienceRules.regions?.length) {
    return `Regions: ${experiment.audienceRules.regions.join(', ')}`;
  }

  return 'Global audience';
}

export interface ExperimentListProps {
  readonly experiments: readonly ExperimentRecord[];
  readonly onSelect?: (experimentId: string) => void;
}

export function ExperimentList({ experiments, onSelect }: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <Card>
        <Card.Content>
          <p className="text-sm text-muted-foreground">
            You have not created any experiments yet.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {experiments.map((experiment) => (
        <Card key={experiment.id}>
          <Card.Header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <Card.Title>{experiment.name}</Card.Title>
              <Card.Description>
                {experiment.description?.trim() || 'No description provided.'}
              </Card.Description>
            </div>
            <Badge color={experiment.status === 'running' ? 'success' : 'default'} variant="soft">
              {experiment.status}
            </Badge>
          </Card.Header>
          <Card.Content className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <p>{experiment.variants.length} variants</p>
            <p>{formatAudienceLabel(experiment)}</p>
            <p>{experiment.productId ? `Product ${experiment.productId}` : 'Global experiment'}</p>
          </Card.Content>
          {onSelect ? (
            <Card.Footer>
              <Button variant="secondary" onPress={() => onSelect(experiment.id)}>
                View experiment
              </Button>
            </Card.Footer>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
