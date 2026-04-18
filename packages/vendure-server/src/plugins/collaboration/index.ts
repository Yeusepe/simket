/**
 * Purpose: Barrel export for CollaborationPlugin.
 * @see ./collaboration.plugin.ts
 * @see ./collaboration.entity.ts
 * @see ./invitation.entity.ts
 * @see ./invitation.service.ts
 */
export {
  CollaborationPlugin,
  CollaborationEntity,
  CollaborationStatus,
  InvitationEntity,
  collaborationConfiguration,
  validateRevenueShare,
  validateCollaborationShares,
  COLLABORATION_TRANSITIONS,
  canTransition,
  splitRevenue,
} from './collaboration.plugin.js';

export type { RevenueSplit, RevenueResult } from './collaboration.plugin.js';
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
