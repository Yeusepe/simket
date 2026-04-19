/**
 * Purpose: Minimal initial data for Vendure e2e tests.
 *
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/testing/
 *   - https://docs.vendure.io/guides/developer-guide/importing-data/#initial-data
 * Tests:
 *   - Used by all e2e test suites
 */
import type { InitialData, LanguageCode } from '@vendure/core';

export const TEST_INITIAL_DATA: InitialData = {
  defaultLanguage: 'en' as LanguageCode,
  defaultZone: 'US',
  taxRates: [
    { name: 'Standard Tax', percentage: 0, zone: 'US', taxCategory: 'standard' },
  ],
  shippingMethods: [],
  paymentMethods: [],
  countries: [
    { name: 'United States', code: 'US', zone: 'US' },
  ],
  collections: [],
};
