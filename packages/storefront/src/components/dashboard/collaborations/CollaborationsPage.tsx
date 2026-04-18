/**
 * Purpose: Creator dashboard collaborations page with tabbed active, pending, and completed views.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/docs/react/components/tabs.mdx
 *   - https://heroui.com/docs/react/components/modal.mdx
 *   - https://heroui.com/docs/react/components/card.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationsPage.test.tsx
 */
import { Button, Card, Modal, Tabs, useOverlayState } from '@heroui/react';
import { useMemo, useState } from 'react';
import type {
  CollaborationProductOption,
  CreateCollaborationInput,
  DashboardCollaboration,
  DashboardInvitation,
} from './collab-types';
import { formatCurrency } from './collaboration-utils';
import { ActiveCollaborationCard } from './ActiveCollaborationCard';
import { CollaborationDetailModal } from './CollaborationDetailModal';
import { CreateCollaborationForm } from './CreateCollaborationForm';
import { PendingInvitationCard } from './PendingInvitationCard';

type CollaborationTab = 'active' | 'pending' | 'completed';

export interface CollaborationsPageProps {
  readonly activeCollaborations: readonly DashboardCollaboration[];
  readonly pendingInvitations: readonly DashboardInvitation[];
  readonly completedCollaborations: readonly DashboardCollaboration[];
  readonly availableProducts: readonly CollaborationProductOption[];
  readonly currentCreatorName: string;
  readonly isCreatingCollaboration?: boolean;
  readonly onCreateCollaboration?: (input: CreateCollaborationInput) => Promise<void> | void;
  readonly onAcceptInvitation?: (invitationId: string) => void;
  readonly onDeclineInvitation?: (invitationId: string) => void;
}

export function CollaborationsPage({
  activeCollaborations,
  pendingInvitations,
  completedCollaborations,
  availableProducts,
  currentCreatorName,
  isCreatingCollaboration = false,
  onCreateCollaboration,
  onAcceptInvitation,
  onDeclineInvitation,
}: CollaborationsPageProps) {
  const [selectedTab, setSelectedTab] = useState<CollaborationTab>('active');
  const [selectedCollaborationId, setSelectedCollaborationId] = useState<string | null>(null);
  const createDialog = useOverlayState();
  const totalCollaborationEarnings = useMemo(
    () =>
      [...activeCollaborations, ...completedCollaborations].reduce(
        (total, collaboration) => total + collaboration.totalEarningsCents,
        0,
      ),
    [activeCollaborations, completedCollaborations],
  );

  const selectedCollaboration =
    [...activeCollaborations, ...completedCollaborations].find(
      (collaboration) => collaboration.id === selectedCollaborationId,
    ) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Collaborations</h1>
          <p className="max-w-3xl text-muted-foreground">
            Track live revenue shares, respond to invitations, and review settlement history for
            each collaborative release.
          </p>
        </div>
        <Button onPress={createDialog.open}>Create collaboration</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Active collaborations"
          value={String(activeCollaborations.length)}
          detail="Products currently sharing revenue."
        />
        <SummaryCard
          label="Pending invitations"
          value={String(pendingInvitations.length)}
          detail="Incoming and outgoing invites awaiting a decision."
        />
        <SummaryCard
          label="Lifetime collaboration earnings"
          value={formatCurrency(totalCollaborationEarnings)}
          detail="Total creator earnings across active and completed collaborations."
        />
      </div>

      <Tabs
        selectedKey={selectedTab}
        variant="secondary"
        onSelectionChange={(key) => setSelectedTab(String(key) as CollaborationTab)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Collaboration views">
            <Tabs.Tab id="active">
              Active ({activeCollaborations.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="pending">
              Pending Invitations ({pendingInvitations.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="completed">
              Completed ({completedCollaborations.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-6" id="active">
          <div className="grid gap-4 xl:grid-cols-2">
            {activeCollaborations.length === 0 ? (
              <EmptyState
                title="No active collaborations yet"
                description="Create a collaboration or accept an invitation to start sharing revenue."
              />
            ) : (
              activeCollaborations.map((collaboration) => (
                <ActiveCollaborationCard
                  key={collaboration.id}
                  collaboration={collaboration}
                  onOpenDetails={setSelectedCollaborationId}
                />
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-6" id="pending">
          <div className="grid gap-4 xl:grid-cols-2">
            {pendingInvitations.length === 0 ? (
              <EmptyState
                title="No pending invitations"
                description="Incoming and outgoing invites will appear here until they are accepted or declined."
              />
            ) : (
              pendingInvitations.map((invitation) => (
                <PendingInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={onAcceptInvitation}
                  onDecline={onDeclineInvitation}
                />
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-6" id="completed">
          <div className="grid gap-4 xl:grid-cols-2">
            {completedCollaborations.length === 0 ? (
              <EmptyState
                title="No completed collaborations"
                description="Completed revenue-sharing releases stay here for later review."
              />
            ) : (
              completedCollaborations.map((collaboration) => (
                <ActiveCollaborationCard
                  key={collaboration.id}
                  collaboration={collaboration}
                  onOpenDetails={setSelectedCollaborationId}
                />
              ))
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      <Modal state={createDialog}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="lg">
            <Modal.Dialog aria-label="Create collaboration">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Create collaboration</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CreateCollaborationForm
                  availableProducts={availableProducts}
                  currentCreatorName={currentCreatorName}
                  isSubmitting={isCreatingCollaboration}
                  onCancel={createDialog.close}
                  onSubmit={async (input) => {
                    await onCreateCollaboration?.(input);
                    createDialog.close();
                  }}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <CollaborationDetailModal
        collaboration={selectedCollaboration}
        onClose={() => setSelectedCollaborationId(null)}
      />
    </div>
  );
}

interface SummaryCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Description>{label}</Card.Description>
        <Card.Title>{value}</Card.Title>
      </Card.Header>
      <Card.Content>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </Card.Content>
    </Card>
  );
}

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card variant="transparent" className="border border-dashed border-default-200">
      <Card.Header className="space-y-1">
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
    </Card>
  );
}
