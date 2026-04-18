/**
 * Purpose: Modal with full collaboration details, split breakdown, earnings history, and settlements.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/docs/react/components/modal.mdx
 *   - https://heroui.com/docs/react/components/avatar.mdx
 *   - https://heroui.com/docs/react/components/chip.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationsPage.test.tsx
 */
import { Avatar, Card, Chip, Modal, useOverlayState } from '@heroui/react';
import { useEffect } from 'react';
import type { DashboardCollaboration } from './collab-types';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getParticipantInitials,
  getSettlementStatusColor,
  sortParticipantsByRole,
  summarizeSettlementState,
} from './collaboration-utils';
import { CollaborationEarnings } from './CollaborationEarnings';

interface CollaborationDetailModalProps {
  readonly collaboration: DashboardCollaboration | null;
  readonly onClose: () => void;
}

export function CollaborationDetailModal({
  collaboration,
  onClose,
}: CollaborationDetailModalProps) {
  const dialog = useOverlayState({ isOpen: collaboration !== null });

  useEffect(() => {
    if (collaboration) {
      dialog.open();
    } else {
      dialog.close();
    }
  }, [collaboration, dialog]);

  if (!collaboration) {
    return null;
  }

  const participants = sortParticipantsByRole(collaboration.participants);
  const settlementState = summarizeSettlementState(collaboration.settlementSummary);

  return (
    <Modal state={dialog}>
      <Modal.Backdrop
        isDismissable
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            onClose();
          }
        }}
      >
        <Modal.Container size="cover">
          <Modal.Dialog aria-label={`${collaboration.productName} collaboration details`}>
            <Modal.CloseTrigger onPress={onClose} />
            <Modal.Header className="items-start justify-between gap-4">
              <div className="space-y-1">
                <Modal.Heading>{collaboration.productName}</Modal.Heading>
                <p className="text-sm text-muted-foreground">
                  Started {formatDate(collaboration.startedAt)}
                </p>
              </div>
              <Chip color={settlementState.color} variant="soft">
                <Chip.Label>{settlementState.label}</Chip.Label>
              </Chip>
            </Modal.Header>
            <Modal.Body className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <Card variant="transparent">
                  <Card.Header className="px-0">
                    <Card.Title>Collaborators</Card.Title>
                    <Card.Description>Final split percentages and lifetime earnings.</Card.Description>
                  </Card.Header>
                  <Card.Content className="space-y-3 px-0">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between rounded-2xl border border-default-200 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar aria-label={`${participant.name} avatar`} className="size-10">
                            {participant.avatarUrl ? (
                              <Avatar.Image alt={participant.name} src={participant.avatarUrl} />
                            ) : null}
                            <Avatar.Fallback>
                              {getParticipantInitials(participant.name)}
                            </Avatar.Fallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            <p className="text-sm text-default-500">
                              {participant.handle ?? participant.email ?? participant.role}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPercent(participant.splitPercent)}</p>
                          <p className="text-sm text-default-500">
                            {formatCurrency(participant.earningsCents)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </Card.Content>
                </Card>

                <Card variant="transparent">
                  <Card.Header className="px-0">
                    <Card.Title>Settlement status</Card.Title>
                    <Card.Description>Persisted payout totals from the settlement ledger.</Card.Description>
                  </Card.Header>
                  <Card.Content className="grid gap-3 px-0">
                    <SettlementMetric
                      label="Completed"
                      value={collaboration.settlementSummary.completedCents}
                    />
                    <SettlementMetric
                      label="Pending"
                      value={collaboration.settlementSummary.pendingCents}
                    />
                    <SettlementMetric
                      label="Processing"
                      value={collaboration.settlementSummary.processingCents}
                    />
                    <SettlementMetric
                      label="Failed"
                      value={collaboration.settlementSummary.failedCents}
                    />
                  </Card.Content>
                </Card>
              </div>

              <CollaborationEarnings history={collaboration.earningsHistory} />

              <Card variant="transparent">
                <Card.Header className="px-0">
                  <Card.Title>Earnings history</Card.Title>
                  <Card.Description>Recent settlement events for this collaboration.</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3 px-0">
                  {collaboration.settlementHistory.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-default-500">{formatDate(event.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Chip color={getSettlementStatusColor(event.status)} variant="soft">
                          <Chip.Label className="capitalize">{event.status}</Chip.Label>
                        </Chip>
                        <p className="font-medium">{formatCurrency(event.amountCents)}</p>
                      </div>
                    </div>
                  ))}
                </Card.Content>
              </Card>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface SettlementMetricProps {
  readonly label: string;
  readonly value: number;
}

function SettlementMetric({ label, value }: SettlementMetricProps) {
  return (
    <div className="rounded-2xl border border-default-200 p-4">
      <p className="text-sm text-default-500">{label}</p>
      <p className="mt-2 font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}
