/**
 * Purpose: Creator dashboard page section for listing, creating, editing, and deleting license policies.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicensePoliciesPage.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card, Modal, useOverlayState } from '@heroui/react';
import { LicensePolicyForm } from './LicensePolicyForm';
import type { LicensePolicy, LicensePolicyFormData, LicenseProductOption } from './license-types';
import { summarizeDurationDays } from './use-licenses';

interface LicensePoliciesPageProps {
  readonly policies: readonly LicensePolicy[];
  readonly availableProducts: readonly LicenseProductOption[];
  readonly onCreatePolicy: (data: LicensePolicyFormData) => Promise<void> | void;
  readonly onUpdatePolicy: (policyId: string, data: LicensePolicyFormData) => Promise<void> | void;
  readonly onDeletePolicy: (policyId: string) => Promise<void> | void;
}

export function LicensePoliciesPage({
  policies,
  availableProducts,
  onCreatePolicy,
  onUpdatePolicy,
  onDeletePolicy,
}: LicensePoliciesPageProps) {
  const [editingPolicy, setEditingPolicy] = useState<LicensePolicy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalState = useOverlayState();

  const attachedProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const policy of policies) {
      counts.set(policy.id, policy.attachedProductIds.length);
    }
    return counts;
  }, [policies]);

  const openCreate = () => {
    setEditingPolicy(null);
    modalState.open();
  };

  const openEdit = (policy: LicensePolicy) => {
    setEditingPolicy(policy);
    modalState.open();
  };

  const handleSubmit = async (data: LicensePolicyFormData) => {
    setIsSubmitting(true);
    try {
      if (editingPolicy) {
        await onUpdatePolicy(editingPolicy.id, data);
      } else {
        await onCreatePolicy(data);
      }
      modalState.close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <Card.Title>License policies</Card.Title>
          <Card.Description>
            Define reusable Keygen policy settings for single-user, team, and enterprise product offers.
          </Card.Description>
        </div>
        <Button onPress={openCreate}>New policy</Button>
      </Card.Header>
      <Card.Content className="space-y-4">
        {policies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-default-300 px-6 py-10 text-center">
            <p className="text-lg font-medium">No policies yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a reusable license policy before issuing keys.</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {policies.map((policy) => {
              const attachedCount = attachedProductCounts.get(policy.id) ?? 0;
              return (
                <Card key={policy.id} variant="secondary">
                  <Card.Header className="space-y-1">
                    <Card.Title>{policy.name}</Card.Title>
                    <Card.Description>{policy.description || 'No policy description provided yet.'}</Card.Description>
                  </Card.Header>
                  <Card.Content className="grid gap-3 sm:grid-cols-2">
                    <p className="text-sm"><span className="font-medium">Scheme:</span> {policy.scheme}</p>
                    <p className="text-sm"><span className="font-medium">Max machines:</span> {policy.maxMachines}</p>
                    <p className="text-sm"><span className="font-medium">Max uses:</span> {policy.maxUses}</p>
                    <p className="text-sm"><span className="font-medium">Duration:</span> {summarizeDurationDays(policy.durationDays)}</p>
                    <p className="text-sm sm:col-span-2">{attachedCount} {attachedCount === 1 ? 'product attached' : 'products attached'}</p>
                  </Card.Content>
                  <Card.Footer className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onPress={() => openEdit(policy)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => void onDeletePolicy(policy.id)}>
                      Delete
                    </Button>
                  </Card.Footer>
                </Card>
              );
            })}
          </div>
        )}
      </Card.Content>

      <Modal state={modalState}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog aria-label={editingPolicy ? 'Edit license policy' : 'Create license policy'}>
              <Modal.CloseTrigger>
                <Button isIconOnly variant="ghost" aria-label="Close policy form">
                  ×
                </Button>
              </Modal.CloseTrigger>
              <Modal.Header>
                <Modal.Heading>{editingPolicy ? 'Edit policy' : 'Create policy'}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <LicensePolicyForm
                  initialData={editingPolicy ?? undefined}
                  availableProducts={availableProducts}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onCancel={() => modalState.close()}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}
