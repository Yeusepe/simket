/**
 * Purpose: CollaborationPlugin — manages revenue-sharing between creators on products.
 * Governing docs:
 *   - docs/architecture.md (§4 Collaboration model)
 *   - docs/domain-model.md (Collaboration entity, state machine)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://stripe.com/docs/connect/destination-charges (revenue split model)
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/collaboration.plugin.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import { CollaborationEntity, CollaborationStatus } from './collaboration.entity.js';
import { InvitationEntity } from './invitation.entity.js';

// ─── Validation ───────────────────────────────────────────────────────

/**
 * Validates a single revenue share percentage value.
 * Returns an error message if invalid, undefined if valid.
 */
function validateRevenueShare(value: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'revenueSharePercent must be a finite number';
  }
  if (value < 0) {
    return 'revenueSharePercent must be at least 0';
  }
  if (value > 100) {
    return 'revenueSharePercent must be at most 100';
  }
  return undefined;
}

/**
 * Validates that the total of all collaboration shares for a product does not exceed 100%.
 * @param shares — array of individual share percentages
 * Returns an error message if the sum exceeds 100, undefined if valid.
 */
function validateCollaborationShares(shares: number[]): string | undefined {
  const total = shares.reduce((sum, s) => sum + s, 0);
  if (total > 100) {
    return `Total collaboration shares (${total}%) exceed 100%`;
  }
  return undefined;
}

// ─── State machine ────────────────────────────────────────────────────

/**
 * Valid state transitions for collaboration lifecycle.
 * Each key maps to an array of states that can be transitioned to.
 *
 * Pending  → Invited, Revoked
 * Invited  → Active, Revoked
 * Active   → Revoked
 * Revoked  → (terminal — no outbound transitions)
 */
const COLLABORATION_TRANSITIONS: Record<CollaborationStatus, CollaborationStatus[]> = {
  [CollaborationStatus.Pending]: [CollaborationStatus.Invited, CollaborationStatus.Revoked],
  [CollaborationStatus.Invited]: [CollaborationStatus.Active, CollaborationStatus.Revoked],
  [CollaborationStatus.Active]: [CollaborationStatus.Revoked],
  [CollaborationStatus.Revoked]: [],
};

/**
 * Checks whether a transition from one status to another is allowed.
 */
function canTransition(from: CollaborationStatus, to: CollaborationStatus): boolean {
  return COLLABORATION_TRANSITIONS[from].includes(to);
}

// ─── Revenue splitting ────────────────────────────────────────────────

interface RevenueSplit {
  creatorId: string;
  percent: number;
}

interface RevenueResult {
  creatorId: string;
  amount: number;
}

/**
 * Splits a total monetary amount (in smallest currency unit, e.g. cents) among
 * creators according to their share percentages.
 *
 * Amounts are rounded down to integers (floor). This ensures the total distributed
 * never exceeds the input amount — any remainder (dust) stays with the platform.
 *
 * @see https://stripe.com/docs/connect/destination-charges
 */
function splitRevenue(totalAmount: number, shares: RevenueSplit[]): RevenueResult[] {
  return shares.map((share) => ({
    creatorId: share.creatorId,
    amount: Math.floor(totalAmount * (share.percent / 100)),
  }));
}

// ─── Plugin configuration ─────────────────────────────────────────────

/**
 * Applies CollaborationPlugin configuration to the Vendure config.
 * Exported separately for unit-testability without bootstrapping Vendure.
 */
function collaborationConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  // Entity registration is handled by the @VendurePlugin entities array.
  // This configuration function is available for future custom field additions.
  return config;
}

// ─── Plugin class ─────────────────────────────────────────────────────

/**
 * CollaborationPlugin — registers the CollaborationEntity and provides
 * pure utility functions for collaboration management.
 *
 * Entity registration uses Vendure's plugin `entities` array.
 * Business logic (validation, state transitions, revenue splitting) is exported
 * as pure functions for direct testability.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [CollaborationEntity, InvitationEntity],
  configuration: collaborationConfiguration,
  compatibility: '^3.0.0',
})
export class CollaborationPlugin {}

// ─── Exports ──────────────────────────────────────────────────────────

export {
  CollaborationEntity,
  CollaborationStatus,
  InvitationEntity,
  collaborationConfiguration,
  validateRevenueShare,
  validateCollaborationShares,
  COLLABORATION_TRANSITIONS,
  canTransition,
  splitRevenue,
};

export type { RevenueSplit, RevenueResult };
