/**
 * Purpose: Display per-variant conversion metrics and a lightweight significance callout for creators.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/table
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentResults.test.tsx
 */
import { Card, Table } from '@heroui/react';
import type { ExperimentVariantMetrics } from './experiment-types';

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getSignificanceMessage(results: readonly ExperimentVariantMetrics[]): string {
  const totalImpressions = results.reduce((sum, result) => sum + result.impressions, 0);
  return totalImpressions < 50
    ? 'Needs more data before calling a winner.'
    : 'Directional significance only — verify with a larger sample.';
}

export interface ExperimentResultsProps {
  readonly results: readonly ExperimentVariantMetrics[];
}

export function ExperimentResults({ results }: ExperimentResultsProps) {
  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Experiment results</Card.Title>
        <Card.Description>{getSignificanceMessage(results)}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Experiment results table">
              <Table.Header>
                <Table.Column isRowHeader>Variant</Table.Column>
                <Table.Column>Views</Table.Column>
                <Table.Column>Clicks</Table.Column>
                <Table.Column>Purchases</Table.Column>
                <Table.Column>Conversion</Table.Column>
              </Table.Header>
              <Table.Body>
                {results.map((result) => (
                  <Table.Row key={result.variantName} id={result.variantName}>
                    <Table.Cell>{result.variantName}</Table.Cell>
                    <Table.Cell>{result.impressions}</Table.Cell>
                    <Table.Cell>{result.clicks}</Table.Cell>
                    <Table.Cell>{result.purchases}</Table.Cell>
                    <Table.Cell>{formatPercentage(result.conversionRate)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        <div className="space-y-3">
          {results.map((result) => (
            <div key={`${result.variantName}-bar`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{result.variantName}</span>
                <span>{formatPercentage(result.conversionRate)}</span>
              </div>
              <div className="h-3 rounded-full bg-surface-secondary">
                <div
                  className="h-3 rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(result.conversionRate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
