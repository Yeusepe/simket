/**
 * Purpose: Barrel exports for collaboration invitation dashboard components and hooks.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationList.test.tsx
 *   - packages/storefront/src/components/dashboard/collaborations/InviteCollaborator.test.tsx
 *   - packages/storefront/src/components/dashboard/collaborations/InvitationResponse.test.tsx
 *   - packages/storefront/src/components/dashboard/collaborations/use-collaborations.test.ts
 */
export { CollaborationList } from './CollaborationList';
export { ActiveCollaborationCard } from './ActiveCollaborationCard';
export { CollaborationDetailModal } from './CollaborationDetailModal';
export { CollaborationEarnings } from './CollaborationEarnings';
export { CollaborationsPage } from './CollaborationsPage';
export { CreateCollaborationForm } from './CreateCollaborationForm';
export { InviteCollaborator } from './InviteCollaborator';
export { InvitationResponse } from './InvitationResponse';
export { PendingInvitationCard } from './PendingInvitationCard';
export { useCollaborations } from './use-collaborations';
export type {
  CollaborationEarningsPoint,
  CollaborationOverview,
  CollaborationParticipant,
  CollaborationProductOption,
  CollaborationSummary,
  CollaborationSettlementEvent,
  CollaborationSettlementSummary,
  CollaborationRole,
  CollaborationsApi,
  CreateInvitationInput,
  CreateCollaborationInput,
  CreateCollaborationInviteeInput,
  DashboardCollaboration,
  DashboardCollaborationStatus,
  DashboardInvitation,
  DashboardInvitationDirection,
  InvitationDetail,
  InvitationSummary,
  SettlementViewStatus,
  UseCollaborationsHook,
  UseCollaborationsOptions,
  UseCollaborationsResult,
} from './collab-types';
