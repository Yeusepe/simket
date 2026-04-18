/**
 * Purpose: Creator dashboard page section for filtering, inspecting, and managing issued licenses.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/table
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicenseListPage.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card, Table } from '@heroui/react';
import { LicenseDetailModal } from './LicenseDetailModal';
import type { LicensePolicy, LicenseRecord } from './license-types';
import { maskLicenseKey } from './use-licenses';

interface LicenseListPageProps {
  readonly licenses: readonly LicenseRecord[];
  readonly policies: readonly LicensePolicy[];
  readonly onSuspend: (licenseId: string) => Promise<void> | void;
  readonly onReinstate: (licenseId: string) => Promise<void> | void;
  readonly onRevoke: (licenseId: string) => Promise<void> | void;
  readonly onExtend: (licenseId: string, days: number) => Promise<void> | void;
}

const STATUS_OPTIONS = ['all', 'active', 'expired', 'suspended', 'revoked'] as const;

function formatStatusLabel(status: (typeof STATUS_OPTIONS)[number]): string {
  return status === 'all' ? 'All statuses' : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function findPolicyName(policyId: string, policies: readonly LicensePolicy[]): string {
  return policies.find((policy) => policy.id === policyId)?.name ?? 'Unknown';
}

export function LicenseListPage({
  licenses,
  policies,
  onSuspend,
  onReinstate,
  onRevoke,
  onExtend,
}: LicenseListPageProps) {
  const [productFilter, setProductFilter] = useState<string>('all');
  const [policyFilter, setPolicyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const license of licenses) {
      seen.set(license.productId, license.productName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name));
  }, [licenses]);

  const filteredLicenses = useMemo(
    () =>
      licenses.filter((license) => {
        const matchesProduct = productFilter === 'all' || license.productId === productFilter;
        const matchesPolicy = policyFilter === 'all' || license.policyId === policyFilter;
        const matchesStatus = statusFilter === 'all' || license.status === statusFilter;
        return matchesProduct && matchesPolicy && matchesStatus;
      }),
    [licenses, policyFilter, productFilter, statusFilter],
  );

  const selectedLicense = filteredLicenses.find((license) => license.id === selectedLicenseId)
    ?? licenses.find((license) => license.id === selectedLicenseId)
    ?? null;
  const selectedPolicy = selectedLicense
    ? policies.find((policy) => policy.id === selectedLicense.policyId) ?? null
    : null;

  return (
    <>
      <Card>
        <Card.Header className="flex flex-col gap-4">
          <div className="space-y-1">
            <Card.Title>Issued licenses</Card.Title>
            <Card.Description>
              Filter customer keys by product, policy, and status, then manage lifecycle actions without leaving the dashboard.
            </Card.Description>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? 'secondary' : 'ghost'}
                  onPress={() => setStatusFilter(status)}
                >
                  {formatStatusLabel(status)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={productFilter === 'all' ? 'secondary' : 'ghost'}
                onPress={() => setProductFilter('all')}
              >
                All products
              </Button>
              {productOptions.map((product) => (
                <Button
                  key={product.id}
                  size="sm"
                  variant={productFilter === product.id ? 'secondary' : 'ghost'}
                  onPress={() => setProductFilter(product.id)}
                >
                  {product.name}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={policyFilter === 'all' ? 'secondary' : 'ghost'}
                onPress={() => setPolicyFilter('all')}
              >
                All policies
              </Button>
              {policies.map((policy) => (
                <Button
                  key={policy.id}
                  size="sm"
                  variant={policyFilter === policy.id ? 'secondary' : 'ghost'}
                  onPress={() => setPolicyFilter(policy.id)}
                >
                  {policy.name}
                </Button>
              ))}
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Issued licenses" className="min-w-[880px]">
                <Table.Header>
                  <Table.Column isRowHeader>License key</Table.Column>
                  <Table.Column>Customer</Table.Column>
                  <Table.Column>Product</Table.Column>
                  <Table.Column>Policy</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Created</Table.Column>
                  <Table.Column>Expiry</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {filteredLicenses.length === 0 ? (
                    <Table.Row>
                      <Table.Cell>No licenses match the current filters.</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                      <Table.Cell>—</Table.Cell>
                    </Table.Row>
                  ) : (
                    filteredLicenses.map((license) => (
                      <Table.Row key={license.id} id={license.id}>
                        <Table.Cell>{maskLicenseKey(license.key)}</Table.Cell>
                        <Table.Cell>
                          <div className="space-y-0.5">
                            <p>{license.customerName}</p>
                            <p className="text-xs text-muted-foreground">{license.customerEmail}</p>
                          </div>
                        </Table.Cell>
                        <Table.Cell>{license.productName}</Table.Cell>
                        <Table.Cell>{findPolicyName(license.policyId, policies)}</Table.Cell>
                        <Table.Cell className="capitalize">{license.status}</Table.Cell>
                        <Table.Cell>{formatDate(license.createdAt)}</Table.Cell>
                        <Table.Cell>{formatDate(license.expiresAt)}</Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-2">
                            {license.status === 'suspended' ? (
                              <Button size="sm" variant="ghost" onPress={() => void onReinstate(license.id)}>
                                Reinstate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Suspend ${license.customerName} license`}
                                onPress={() => void onSuspend(license.id)}
                              >
                                Suspend
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`View ${license.customerName} license details`}
                              onPress={() => setSelectedLicenseId(license.id)}
                            >
                              View
                            </Button>
                            <Button size="sm" variant="ghost" onPress={() => void onRevoke(license.id)}>
                              Revoke
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>

      <LicenseDetailModal
        isOpen={selectedLicense !== null}
        license={selectedLicense}
        policy={selectedPolicy}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedLicenseId(null);
          }
        }}
        onSuspend={onSuspend}
        onReinstate={onReinstate}
        onRevoke={onRevoke}
        onExtend={onExtend}
      />
    </>
  );
}
