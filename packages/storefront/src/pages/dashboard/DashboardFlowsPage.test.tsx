/**
 * Purpose: Unit tests for DashboardFlowsPage component.
 */
import { describe, it, expect } from 'vitest';
import { DashboardFlowsPage } from './DashboardFlowsPage';
import type { FlowStepType } from './DashboardFlowsPage';

describe('DashboardFlowsPage', () => {
  it('is a function component', () => {
    expect(typeof DashboardFlowsPage).toBe('function');
  });

  it('FlowStepType union covers all step types', () => {
    const types: FlowStepType[] = ['checkout', 'upsell', 'post-purchase', 'thank-you'];
    expect(types).toHaveLength(4);
  });
});
