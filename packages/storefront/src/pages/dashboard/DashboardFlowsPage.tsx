/**
 * Purpose: Dashboard Flows page — manage checkout flows, upsell sequences,
 * and post-purchase page sequences per product.
 *
 * Governing docs:
 *   - docs/architecture.md (§6.1 Creator Dashboard)
 *   - docs/domain-model.md (CheckoutFlow entity)
 * External references:
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/pages/dashboard/DashboardFlowsPage.test.tsx
 */
import { Button, Card, Chip, Modal, Spinner, useOverlayState } from '@heroui/react';
import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FlowStepType = 'checkout' | 'upsell' | 'post-purchase' | 'thank-you';

export interface FlowStep {
  readonly id: string;
  readonly type: FlowStepType;
  readonly title: string;
  /** Product ID for upsell steps, or store page ID for post-purchase steps. */
  readonly targetId?: string;
  /** Optional discount % applied to the upsell product. */
  readonly discountPercent?: number;
  readonly order: number;
}

export interface CheckoutFlow {
  readonly id: string;
  readonly name: string;
  readonly productId: string;
  readonly productName: string;
  readonly steps: readonly FlowStep[];
  readonly isActive: boolean;
  readonly createdAt: string;
}

export interface FlowsApi {
  fetchFlows(): Promise<readonly CheckoutFlow[]>;
  createFlow(name: string, productId: string): Promise<CheckoutFlow>;
  deleteFlow(flowId: string): Promise<void>;
  toggleFlow(flowId: string, isActive: boolean): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Step type labels + colors                                          */
/* ------------------------------------------------------------------ */

const STEP_TYPE_LABEL: Record<FlowStepType, string> = {
  checkout: 'Checkout',
  upsell: 'Upsell',
  'post-purchase': 'Post-Purchase Page',
  'thank-you': 'Thank You',
};

const STEP_TYPE_COLOR: Record<FlowStepType, 'accent' | 'default' | 'success' | 'warning'> = {
  checkout: 'accent',
  upsell: 'warning',
  'post-purchase': 'default',
  'thank-you': 'success',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface DashboardFlowsPageProps {
  readonly api?: FlowsApi;
}

export function DashboardFlowsPage({ api }: DashboardFlowsPageProps) {
  const [flows, setFlows] = useState<readonly CheckoutFlow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const modalState = useOverlayState();

  const loadFlows = async () => {
    if (!api) return;
    setIsLoading(true);
    try {
      const result = await api.fetchFlows();
      setFlows(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFlows();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flows</h1>
          <p className="text-muted-foreground">
            Configure checkout flows, upsell sequences, and post-purchase pages for your products.
          </p>
        </div>
        <Button variant="primary" onPress={modalState.open}>
          Create Flow
        </Button>
      </div>

      {error ? (
        <Card>
          <Card.Content className="p-6">
            <p className="text-sm text-danger">{error.message}</p>
          </Card.Content>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : flows.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>No flows yet</Card.Title>
            <Card.Description>
              Create a checkout flow to configure upsells, post-purchase pages, and
              thank-you screens for your products.
            </Card.Description>
          </Card.Header>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onToggle={(active) => {
                void api?.toggleFlow(flow.id, active);
                setFlows((prev) =>
                  prev.map((f) => (f.id === flow.id ? { ...f, isActive: active } : f)),
                );
              }}
              onDelete={() => {
                void api?.deleteFlow(flow.id);
                setFlows((prev) => prev.filter((f) => f.id !== flow.id));
              }}
            />
          ))}
        </div>
      )}

      <Modal state={modalState}>
        <Modal.Backdrop />
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Create Checkout Flow</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-muted-foreground">
                Flow creation form will be wired here once the backend API is available.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={modalState.close}>
                Cancel
              </Button>
              <Button variant="primary" onPress={modalState.close}>
                Create
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FlowCard                                                           */
/* ------------------------------------------------------------------ */

interface FlowCardProps {
  readonly flow: CheckoutFlow;
  readonly onToggle: (active: boolean) => void;
  readonly onDelete: () => void;
}

function FlowCard({ flow, onToggle, onDelete }: FlowCardProps) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Card.Title>{flow.name}</Card.Title>
          <Chip color={flow.isActive ? 'success' : 'default'} variant="soft">
            {flow.isActive ? 'Active' : 'Inactive'}
          </Chip>
        </div>
        <Card.Description>For: {flow.productName}</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Steps</p>
          <div className="flex flex-wrap gap-2">
            {flow.steps.map((step) => (
              <Chip key={step.id} color={STEP_TYPE_COLOR[step.type]} size="sm" variant="soft">
                {step.order + 1}. {STEP_TYPE_LABEL[step.type]}: {step.title}
              </Chip>
            ))}
          </div>
        </div>
      </Card.Content>
      <Card.Footer className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onPress={() => onToggle(!flow.isActive)}
        >
          {flow.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="danger" onPress={onDelete}>
          Delete
        </Button>
      </Card.Footer>
    </Card>
  );
}

