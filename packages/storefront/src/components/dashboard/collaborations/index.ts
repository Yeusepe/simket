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
export { InviteCollaborator } from './InviteCollaborator';
export { InvitationResponse } from './InvitationResponse';
export { useCollaborations } from './use-collaborations';
export type {
  CollaborationOverview,
  CollaborationSummary,
  CollaborationsApi,
  CreateInvitationInput,
  InvitationDetail,
  InvitationSummary,
  UseCollaborationsHook,
  UseCollaborationsOptions,
  UseCollaborationsResult,
} from './collab-types';
