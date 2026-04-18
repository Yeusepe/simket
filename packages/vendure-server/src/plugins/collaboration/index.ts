/**
 * Purpose: Barrel export for CollaborationPlugin.
 * @see ./collaboration.plugin.ts
 * @see ./collaboration.entity.ts
 * @see ./invitation.entity.ts
 * @see ./invitation.service.ts
 * @see ./revenue-split.service.ts
 * @see ./settlement.entity.ts
 * @see ./settlement.service.ts
 */
export {
  CollaborationPlugin,
  CollaborationEntity,
  CollaborationStatus,
  InvitationEntity,
  SettlementEntity,
  SettlementStatus,
  collaborationConfiguration,
  validateRevenueShare,
  validateCollaborationShares,
  COLLABORATION_TRANSITIONS,
  canTransition,
  splitRevenue,
} from './collaboration.plugin.js';

export type { RevenueSplit, RevenueResult } from './collaboration.plugin.js';
export { settlementAdminApiExtensions } from './settlement.api.js';
export { RevenueSplitService } from './revenue-split.service.js';
export type {
  CollaborativeOrder,
  CollaborativeOrderLine,
  CollaboratorShare,
  RevenueSettlementDraft,
} from './revenue-split.service.js';
export { SettlementResolver } from './settlement.resolver.js';
export { SettlementService } from './settlement.service.js';
export type {
  SettlementEarningsSummary,
  SettlementHistoryFilter,
} from './settlement.service.js';
export {
  CollaborationInvitationService,
  InvitationStatus,
  generateInvitationToken,
  isInvitationExpired,
  validateSplitPercentages,
} from './invitation.service.js';
export type {
  CollaborationInvitationNotification,
  CollaborationInvitationServiceDependencies,
} from './invitation.service.js';
