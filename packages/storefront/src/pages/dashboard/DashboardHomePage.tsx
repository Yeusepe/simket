import { Card } from '@heroui/react';

/**
 * Dashboard home — overview cards with key metrics.
 */
export function DashboardHomePage() {
  const metrics = [
    { label: 'Total Sales', value: '0' },
    { label: 'Revenue', value: '$0.00' },
    { label: 'Products', value: '0' },
    { label: 'Views', value: '0' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <Card.Content className="p-6">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-bold">{m.value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
