/**
 * Purpose: Creator dashboard modal for viewing a full license record, machine activations, validations, and lifecycle actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/modal
 *   - https://developer.mozilla.org/docs/Web/API/Clipboard/writeText
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicenseDetailModal.test.tsx
 */
import { useState } from 'react';
import { Button, Modal, Table, useOverlayState } from '@heroui/react';
import type { LicensePolicy, LicenseRecord } from './license-types';

interface LicenseDetailModalProps {
  readonly isOpen: boolean;
  readonly license: LicenseRecord | null;
  readonly policy?: LicensePolicy | null;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSuspend: (licenseId: string) => Promise<void> | void;
  readonly onReinstate: (licenseId: string) => Promise<void> | void;
  readonly onRevoke: (licenseId: string) => Promise<void> | void;
  readonly onExtend: (licenseId: string, days: number) => Promise<void> | void;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function LicenseDetailModal({
  isOpen,
  license,
  policy,
  onOpenChange,
  onSuspend,
  onReinstate,
  onRevoke,
  onExtend,
}: LicenseDetailModalProps) {
  const modalState = useOverlayState({ isOpen, onOpenChange });
  const [copyFeedback, setCopyFeedback] = useState('');

  if (!license) {
    return null;
  }

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(license.key);
    setCopyFeedback('Copied');
  };

  return (
    <Modal state={modalState}>
      <Modal.Backdrop>
        <Modal.Container size="full" placement="center">
          <Modal.Dialog aria-label={`${license.customerName} license details`}>
            <Modal.CloseTrigger>
              <Button isIconOnly variant="ghost" aria-label="Close license details">
                ×
              </Button>
            </Modal.CloseTrigger>
            <Modal.Header className="flex flex-col items-start gap-1">
              <Modal.Heading>License details</Modal.Heading>
              <p className="text-sm text-muted-foreground">{license.customerName} · {license.productName}</p>
            </Modal.Header>
            <Modal.Body className="space-y-6">
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">License key</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-xl bg-default-100 px-3 py-2 text-sm">{license.key}</code>
                    <Button size="sm" variant="ghost" aria-label="Copy license key" onPress={() => void handleCopy()}>
                      Copy license key
                    </Button>
                    {copyFeedback ? <span className="text-sm text-success">{copyFeedback}</span> : null}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Customer:</span> {license.customerName}</p>
                  <p><span className="font-medium">Email:</span> {license.customerEmail}</p>
                  <p><span className="font-medium">Policy:</span> {policy?.name ?? 'Unknown policy'}</p>
                  <p><span className="font-medium">Status:</span> <span className="capitalize">{license.status}</span></p>
                  <p><span className="font-medium">Created:</span> {formatDate(license.createdAt)}</p>
                  <p><span className="font-medium">Expiry:</span> {formatDate(license.expiresAt)}</p>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="font-medium">Machine activations</h3>
                  <p className="text-sm text-muted-foreground">Track which devices have activated this license.</p>
                </div>
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Machine activations">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>Fingerprint</Table.Column>
                        <Table.Column>Activated</Table.Column>
                        <Table.Column>Last validated</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {license.machineActivations.length === 0 ? (
                          <Table.Row>
                            <Table.Cell>No activations yet.</Table.Cell>
                            <Table.Cell>—</Table.Cell>
                            <Table.Cell>—</Table.Cell>
                            <Table.Cell>—</Table.Cell>
                          </Table.Row>
                        ) : (
                          license.machineActivations.map((activation) => (
                            <Table.Row key={activation.id} id={activation.id}>
                              <Table.Cell>{activation.name}</Table.Cell>
                              <Table.Cell>{activation.fingerprint}</Table.Cell>
                              <Table.Cell>{formatDate(activation.activatedAt)}</Table.Cell>
                              <Table.Cell>{formatDate(activation.lastValidatedAt)}</Table.Cell>
                            </Table.Row>
                          ))
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="font-medium">Validation history</h3>
                  <p className="text-sm text-muted-foreground">Recent Keygen validation events for debugging customer activations.</p>
                </div>
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="License validation history">
                      <Table.Header>
                        <Table.Column isRowHeader>Status</Table.Column>
                        <Table.Column>Detail</Table.Column>
                        <Table.Column>When</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {license.validationHistory.length === 0 ? (
                          <Table.Row>
                            <Table.Cell>No validations recorded.</Table.Cell>
                            <Table.Cell>—</Table.Cell>
                            <Table.Cell>—</Table.Cell>
                          </Table.Row>
                        ) : (
                          license.validationHistory.map((event) => (
                            <Table.Row key={event.id} id={event.id}>
                              <Table.Cell className="capitalize">{event.status}</Table.Cell>
                              <Table.Cell>{event.detail}</Table.Cell>
                              <Table.Cell>{formatDate(event.createdAt)}</Table.Cell>
                            </Table.Row>
                          ))
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </section>
            </Modal.Body>
            <Modal.Footer className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {license.status === 'suspended' ? (
                  <Button variant="secondary" aria-label="Reinstate license" onPress={() => void onReinstate(license.id)}>
                    Reinstate license
                  </Button>
                ) : (
                  <Button variant="secondary" aria-label="Suspend license" onPress={() => void onSuspend(license.id)}>
                    Suspend license
                  </Button>
                )}
                <Button variant="ghost" aria-label="Extend by 30 days" onPress={() => void onExtend(license.id, 30)}>
                  Extend by 30 days
                </Button>
              </div>
              <Button variant="danger" aria-label="Revoke license" onPress={() => void onRevoke(license.id)}>
                Revoke license
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
