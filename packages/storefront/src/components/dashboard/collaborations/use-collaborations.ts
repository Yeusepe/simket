/**
 * Purpose: Manage collaboration dashboard state, invitation responses, and explicit API failures.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - packages/storefront/node_modules/@testing-library/react/types/index.d.ts
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/use-collaborations.test.ts
 */
import { useCallback, useEffect, useState } from 'react';
import type {
  CollaborationSummary,
  CollaborationsApi,
  CreateInvitationInput,
  InvitationDetail,
  InvitationSummary,
  UseCollaborationsOptions,
  UseCollaborationsResult,
} from './collab-types';

function createNotConfiguredError(method: string): Error {
  return new Error(
    `Collaboration API method "${method}" is not configured. Wire the real Vendure collaboration invitation endpoint before using this UI.`,
  );
}

const UNCONFIGURED_API: CollaborationsApi = {
  async listForProduct() {
    throw createNotConfiguredError('listForProduct');
  },
  async createInvitation() {
    throw createNotConfiguredError('createInvitation');
  },
  async getInvitationByToken() {
    throw createNotConfiguredError('getInvitationByToken');
  },
  async acceptInvitation() {
    throw createNotConfiguredError('acceptInvitation');
  },
  async declineInvitation() {
    throw createNotConfiguredError('declineInvitation');
  },
};

function upsertInvitation(
  invitations: readonly InvitationSummary[],
  invitation: InvitationSummary,
): InvitationSummary[] {
  const others = invitations.filter((item) => item.id !== invitation.id);
  return [invitation, ...others];
}

function upsertCollaboration(
  collaborations: readonly CollaborationSummary[],
  collaboration: CollaborationSummary,
): CollaborationSummary[] {
  const others = collaborations.filter((item) => item.id !== collaboration.id);
  return [collaboration, ...others];
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function useCollaborations(
  options: UseCollaborationsOptions = {},
): UseCollaborationsResult {
  const {
    api = UNCONFIGURED_API,
    productId,
    invitationToken,
    autoLoad = true,
  } = options;
  const [collaborations, setCollaborations] = useState<readonly CollaborationSummary[]>([]);
  const [invitations, setInvitations] = useState<readonly InvitationSummary[]>([]);
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(
    async (nextProductId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const overview = await api.listForProduct(nextProductId);
        setCollaborations(overview.collaborations);
        setInvitations(overview.invitations);
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const loadInvitation = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const nextInvitation = await api.getInvitationByToken(token);
        setInvitation(nextInvitation);
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const inviteCollaborator = useCallback(
    async (input: CreateInvitationInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const nextInvitation = await api.createInvitation(input);
        setInvitations((current) => upsertInvitation(current, nextInvitation));
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [api],
  );

  const acceptInvitation = useCallback(
    async (token: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const nextCollaboration = await api.acceptInvitation(token);
        setCollaborations((current) => upsertCollaboration(current, nextCollaboration));
        setInvitations((current) => current.filter((item) => item.token !== token));
        setInvitation((current) =>
          current && current.token === token ? { ...current, status: 'accepted' } : current,
        );
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [api],
  );

  const declineInvitation = useCallback(
    async (token: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const updatedInvitation = await api.declineInvitation(token);
        setInvitations((current) => upsertInvitation(current, updatedInvitation));
        setInvitation((current) =>
          current && current.token === token ? { ...current, status: updatedInvitation.status } : current,
        );
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (autoLoad && productId) {
      void loadProduct(productId);
    }
  }, [autoLoad, loadProduct, productId]);

  useEffect(() => {
    if (autoLoad && invitationToken) {
      void loadInvitation(invitationToken);
    }
  }, [autoLoad, invitationToken, loadInvitation]);

  return {
    collaborations,
    invitations,
    invitation,
    isLoading,
    isSubmitting,
    error,
    loadProduct,
    loadInvitation,
    inviteCollaborator,
    acceptInvitation,
    declineInvitation,
  };
}
