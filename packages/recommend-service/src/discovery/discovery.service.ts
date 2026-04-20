/**
 * Purpose: Generate cursor-paginated discovery feed responses from the
 * recommendation pipeline with popular-item fallback behavior.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 pluggable recommenders, §6 discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/recommend-service/src/discovery/discovery.service.test.ts
 */

import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';

import type { PipelineContext, ScoredCandidate } from '../pipeline.js';
import { PipelineExecutor } from '../pipeline.js';
import type {
  DiscoveryItem,
  DiscoveryRequest,
  DiscoveryResponse,
} from './discovery.types.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const DISCOVERY_TRACER_NAME = 'simket-recommend-discovery';

export interface DiscoveryServiceOptions {
  readonly personalizedPipeline: PipelineExecutor;
  readonly fallbackPipeline?: PipelineExecutor;
  readonly tracer?: Tracer;
}

function clampPageSize(pageSize: number): number {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function getDefaultReason(source: string): string {
  return source === 'popular'
    ? 'Popular in the marketplace'
    : 'Recommended for you';
}

function normalizeScores(candidates: readonly ScoredCandidate[]): ScoredCandidate[] {
  if (candidates.length === 0) {
    return [];
  }

  const min = Math.min(...candidates.map((candidate) => candidate.score));
  const max = Math.max(...candidates.map((candidate) => candidate.score));
  const alreadyNormalized = min >= 0 && max <= 1;

  if (alreadyNormalized) {
    return [...candidates];
  }

  if (min === max) {
    return candidates.map((candidate) => ({ ...candidate, score: 1 }));
  }

  return candidates.map((candidate) => ({
    ...candidate,
    score: (candidate.score - min) / (max - min),
  }));
}

function toDiscoveryItem(candidate: ScoredCandidate): DiscoveryItem {
  const reason = candidate.metadata?.reason;

  return {
    product: {
      id: candidate.productId,
    },
    score: candidate.score,
    reason: typeof reason === 'string' && reason.length > 0
      ? reason
      : getDefaultReason(candidate.source),
    source: candidate.source,
  };
}

export function encodeDiscoveryCursor(offset: number): string {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Discovery cursor offset must be a non-negative integer.');
  }

  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64');
}

export function decodeDiscoveryCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf8'),
    ) as { offset?: unknown };
    const offset = parsed.offset;

    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) {
      throw new Error('Discovery cursor offset must be a non-negative integer.');
    }

    return offset;
  } catch (error) {
    throw new Error(
      `Invalid discovery cursor: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export class DiscoveryService {
  private readonly tracer: Tracer;

  constructor(private readonly options: DiscoveryServiceOptions) {
    this.tracer = options.tracer ?? trace.getTracer(DISCOVERY_TRACER_NAME);
  }

  async getDiscoveryFeed(
    request: DiscoveryRequest,
  ): Promise<DiscoveryResponse> {
    return this.tracer.startActiveSpan('recommend.discoveryFeed', async (span) => {
      const pageSize = clampPageSize(request.pageSize);
      const offset = decodeDiscoveryCursor(request.cursor);
      const requestedLimit = offset + pageSize + 1;

      try {
        if (request.userId.trim().length === 0) {
          throw new Error('Discovery feed requires a non-empty userId.');
        }

        span.setAttributes({
          'discovery.user_id': request.userId,
          'discovery.page_size': pageSize,
          'discovery.offset': offset,
          'discovery.exclude_count': request.excludeIds?.length ?? 0,
        });

        const personalizedCandidates = await this.options.personalizedPipeline.execute(
          this.buildContext(request, requestedLimit),
        );

        const usingFallback = personalizedCandidates.length === 0 &&
          this.options.fallbackPipeline !== undefined;
        const activeCandidates = usingFallback
          ? await this.options.fallbackPipeline!.execute(
              this.buildContext(request, requestedLimit),
            )
          : personalizedCandidates;

        span.setAttribute('discovery.used_fallback', usingFallback);
        span.setAttribute('discovery.candidate_count', activeCandidates.length);

        const normalizedCandidates = normalizeScores(activeCandidates);
        const pageItems = normalizedCandidates
          .slice(offset, offset + pageSize)
          .map(toDiscoveryItem);
        const hasMore = normalizedCandidates.length > offset + pageSize;

        return {
          items: pageItems,
          nextCursor: hasMore ? encodeDiscoveryCursor(offset + pageSize) : undefined,
          totalEstimate: hasMore
            ? offset + pageSize + 1
            : offset + pageItems.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        span.recordException(error instanceof Error ? error : new Error(message));
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private buildContext(
    request: DiscoveryRequest,
    limit: number,
  ): PipelineContext {
    return {
      userId: request.userId,
      limit,
      excludeProductIds: request.excludeIds,
    };
  }
}
