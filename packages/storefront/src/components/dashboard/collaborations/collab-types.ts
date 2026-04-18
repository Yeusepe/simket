/**
 * Purpose: Shared collaboration invitation UI types for the creator dashboard and email-response surfaces.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.7 Svix)
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/use-collaborations.test.ts
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationList.test.tsx
 */
export type CollaborationViewStatus = 'active';

export type InvitationViewStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked';

export interface CollaborationSummary {
  readonly id: string;
  readonly collaboratorName: string;
  readonly collaboratorEmail?: string;
  readonly splitPercent: number;
  readonly status: CollaborationViewStatus;
}

export interface InvitationSummary {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly inviteeEmail: string;
  readonly splitPercent: number;
  readonly status: InvitationViewStatus;
  readonly expiresAt: string;
  readonly token: string;
}

export interface InvitationDetail extends InvitationSummary {
  readonly inviterName?: string;
}

export type CollaborationRole = 'owner' | 'collaborator';

export type DashboardCollaborationStatus = 'active' | 'completed';

export type DashboardInvitationDirection = 'incoming' | 'outgoing';

export type SettlementViewStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CollaborationParticipant {
  readonly id: string;
  readonly name: string;
  readonly handle?: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly role: CollaborationRole;
  readonly splitPercent: number;
  readonly earningsCents: number;
}

export interface CollaborationEarningsPoint {
  readonly period: string;
  readonly earnedCents: number;
  readonly pendingCents: number;
}

export interface CollaborationSettlementSummary {
  readonly pendingCents: number;
  readonly processingCents: number;
  readonly completedCents: number;
  readonly failedCents: number;
}

export interface CollaborationSettlementEvent {
  readonly id: string;
  readonly label: string;
  readonly amountCents: number;
  readonly status: SettlementViewStatus;
  readonly createdAt: string;
  readonly processedAt?: string;
}

export interface DashboardCollaboration {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly collaborationStatus: DashboardCollaborationStatus;
  readonly totalEarningsCents: number;
  readonly participants: readonly CollaborationParticipant[];
  readonly earningsHistory: readonly CollaborationEarningsPoint[];
  readonly settlementSummary: CollaborationSettlementSummary;
  readonly settlementHistory: readonly CollaborationSettlementEvent[];
}

export interface DashboardInvitation {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly inviterName: string;
  readonly inviteeLabel: string;
  readonly direction: DashboardInvitationDirection;
  readonly status: InvitationViewStatus;
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly proposedSplits: readonly CollaborationParticipant[];
}

export interface CollaborationProductOption {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly currencyCode: string;
  readonly status: 'draft' | 'published';
  readonly updatedAt: string;
}

export interface CreateCollaborationInviteeInput {
  readonly identifier: string;
  readonly splitPercent: number;
}

export interface CreateCollaborationInput {
  readonly productId: string;
  readonly ownerSplitPercent: number;
  readonly collaborators: readonly CreateCollaborationInviteeInput[];
}

export interface CollaborationOverview {
  readonly collaborations: readonly CollaborationSummary[];
  readonly invitations: readonly InvitationSummary[];
}

export interface CreateInvitationInput {
  readonly productId: string;
  readonly inviteeEmail: string;
  readonly splitPercent: number;
}

export interface CollaborationsApi {
  listForProduct(productId: string): Promise<CollaborationOverview>;
  createInvitation(input: CreateInvitationInput): Promise<InvitationSummary>;
  getInvitationByToken(token: string): Promise<InvitationDetail>;
  acceptInvitation(token: string): Promise<CollaborationSummary>;
  declineInvitation(token: string): Promise<InvitationSummary>;
}

export interface UseCollaborationsOptions {
  readonly api?: CollaborationsApi;
  readonly productId?: string;
  readonly invitationToken?: string;
  readonly autoLoad?: boolean;
}

export interface UseCollaborationsResult {
  readonly collaborations: readonly CollaborationSummary[];
  readonly invitations: readonly InvitationSummary[];
  readonly invitation: InvitationDetail | null;
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  loadProduct(productId: string): Promise<void>;
  loadInvitation(token: string): Promise<void>;
  inviteCollaborator(input: CreateInvitationInput): Promise<void>;
  acceptInvitation(token: string): Promise<void>;
  declineInvitation(token: string): Promise<void>;
}

export type UseCollaborationsHook = (
  options?: UseCollaborationsOptions,
) => UseCollaborationsResult;
