/**
 * Purpose: Manage creator experiment dashboard state and lightweight CRUD operations.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://react.dev/reference/react/useMemo
 *   - https://react.dev/reference/react/useState
 * Tests:
 *   - packages/storefront/src/components/experiments/useExperiments.test.ts
 */
import { useCallback, useMemo, useState } from 'react';
import type {
  CreateExperimentInput,
  ExperimentEvent,
  ExperimentEventRecord,
  ExperimentRecord,
  ExperimentVariantMetrics,
} from './experiment-types';

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface UseExperimentsOptions {
  readonly initialExperiments?: readonly ExperimentRecord[];
  readonly creatorId?: string;
}

export interface UseExperimentsActions {
  readonly createExperiment: (input: CreateExperimentInput) => Promise<ExperimentRecord>;
  readonly startExperiment: (id: string) => Promise<void>;
  readonly stopExperiment: (id: string) => Promise<void>;
  readonly deleteExperiment: (id: string) => Promise<void>;
  readonly trackEvent: (
    experimentId: string,
    variantName: string,
    event: ExperimentEvent,
    userId?: string,
  ) => Promise<void>;
  readonly getResults: (experimentId: string) => ExperimentVariantMetrics[];
}

export interface UseExperimentsReturn {
  readonly experiments: readonly ExperimentRecord[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly actions: UseExperimentsActions;
}

export function useExperiments(options: UseExperimentsOptions = {}): UseExperimentsReturn {
  const creatorId = options.creatorId ?? 'current-creator';
  const [experiments, setExperiments] = useState<readonly ExperimentRecord[]>(
    options.initialExperiments ?? [],
  );
  const [events, setEvents] = useState<readonly ExperimentEventRecord[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const createExperiment = useCallback(async (input: CreateExperimentInput) => {
    const nextExperiment: ExperimentRecord = {
      id: createId('experiment'),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      productId: input.productId?.trim() || null,
      creatorId,
      status: 'draft',
      variants: input.variants,
      audienceRules: input.audienceRules ?? { mode: 'all-users' },
      createdAt: new Date().toISOString(),
    };

    setExperiments((current) => [...current, nextExperiment]);
    return nextExperiment;
  }, [creatorId]);

  const startExperiment = useCallback(async (id: string) => {
    setExperiments((current) =>
      current.map((experiment) =>
        experiment.id === id ? { ...experiment, status: 'running' } : experiment,
      ),
    );
  }, []);

  const stopExperiment = useCallback(async (id: string) => {
    setExperiments((current) =>
      current.map((experiment) =>
        experiment.id === id ? { ...experiment, status: 'completed' } : experiment,
      ),
    );
  }, []);

  const deleteExperiment = useCallback(async (id: string) => {
    setExperiments((current) => current.filter((experiment) => experiment.id !== id));
    setEvents((current) => current.filter((event) => event.experimentId !== id));
  }, []);

  const trackEvent = useCallback(
    async (
      experimentId: string,
      variantName: string,
      event: ExperimentEvent,
      userId?: string,
    ) => {
      setEvents((current) => [...current, { experimentId, variantName, event, userId }]);
    },
    [],
  );

  const metricsByExperimentId = useMemo(() => {
    const grouped = new Map<string, ExperimentVariantMetrics[]>();

    for (const experiment of experiments) {
      const experimentEvents = events.filter((event) => event.experimentId === experiment.id);
      grouped.set(
        experiment.id,
        experiment.variants.map((variant) => {
          const variantEvents = experimentEvents.filter(
            (event) => event.variantName === variant.name,
          );
          const impressions = variantEvents.filter((event) => event.event === 'view').length;
          const clicks = variantEvents.filter((event) => event.event === 'click').length;
          const purchases = variantEvents.filter((event) => event.event === 'purchase').length;

          return {
            variantName: variant.name,
            impressions,
            clicks,
            purchases,
            conversionRate:
              impressions === 0
                ? 0
                : Number(((purchases / impressions) * 100).toFixed(1)),
          };
        }),
      );
    }

    return grouped;
  }, [events, experiments]);

  const getResults = useCallback(
    (experimentId: string) => metricsByExperimentId.get(experimentId) ?? [],
    [metricsByExperimentId],
  );

  return {
    experiments,
    isLoading,
    error,
    actions: {
      createExperiment,
      startExperiment,
      stopExperiment,
      deleteExperiment,
      trackEvent,
      getResults,
    },
  };
}
