/**
 * Purpose: Barrel export for CollaborationPlugin.
 * @see ./collaboration.plugin.ts
 * @see ./collaboration.entity.ts
 */
export {
  CollaborationPlugin,
  CollaborationEntity,
  CollaborationStatus,
  collaborationConfiguration,
  validateRevenueShare,
  validateCollaborationShares,
  COLLABORATION_TRANSITIONS,
  canTransition,
  splitRevenue,
} from './collaboration.plugin.js';

export type { RevenueSplit, RevenueResult } from './collaboration.plugin.js';
