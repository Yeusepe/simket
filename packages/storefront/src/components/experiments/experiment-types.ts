/**
 * Purpose: Shared creator experiment types for the storefront dashboard and product page integrations.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * Tests:
 *   - packages/storefront/src/components/experiments/*.test.tsx
 *   - packages/storefront/src/hooks/useExperimentVariant.test.ts
 */
export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'archived';
export type ExperimentEvent = 'view' | 'click' | 'purchase';

export interface ExperimentAudienceRules {
  readonly mode?: 'all-users' | 'segment';
  readonly regions?: readonly string[];
  readonly minPurchases?: number;
  readonly maxPurchases?: number;
}

export interface ExperimentVariantDefinition {
  readonly name: string;
  readonly weight: number;
  readonly config: Record<string, unknown>;
}

export interface ExperimentRecord {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly productId: string | null;
  readonly creatorId: string;
  readonly status: ExperimentStatus;
  readonly variants: readonly ExperimentVariantDefinition[];
  readonly audienceRules: ExperimentAudienceRules;
  readonly createdAt: string;
}

export interface CreateExperimentInput {
  readonly name: string;
  readonly description?: string;
  readonly productId?: string | null;
  readonly variants: readonly ExperimentVariantDefinition[];
  readonly audienceRules?: ExperimentAudienceRules;
}

export interface ExperimentEventRecord {
  readonly experimentId: string;
  readonly variantName: string;
  readonly event: ExperimentEvent;
  readonly userId?: string;
}

export interface ExperimentVariantMetrics {
  readonly variantName: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly purchases: number;
  readonly conversionRate: number;
}
