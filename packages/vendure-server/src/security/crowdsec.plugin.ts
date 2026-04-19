/**
 * Purpose: Register CrowdSec abuse protection as a global guard for Vendure HTTP surfaces.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.nestjs.com/guards
 * Tests:
 *   - packages/vendure-server/src/security/crowdsec.guard.test.ts
 */
import type { Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { CrowdSecBouncer } from './crowdsec.js';
import { CrowdSecGuard } from './crowdsec.guard.js';

const crowdSecBouncerProvider: Provider = {
  provide: CrowdSecBouncer,
  useFactory: () => {
    const enabled = process.env['CROWDSEC_ENABLED'];
    const lapiUrl = process.env['CROWDSEC_LAPI_URL'];
    const apiKey = process.env['CROWDSEC_API_KEY'];

    if (enabled === 'false' || !lapiUrl || !apiKey) {
      // CrowdSec disabled or unconfigured — pass-through bouncer
      return {
        checkIp: async () => 'allow' as const,
        shutdown: async () => {},
      } as unknown as CrowdSecBouncer;
    }

    return new CrowdSecBouncer({
      lapiUrl,
      apiKey,
      fallbackMode: 'rate-limit',
    });
  },
};

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    crowdSecBouncerProvider,
    CrowdSecGuard,
    {
      provide: APP_GUARD,
      useExisting: CrowdSecGuard,
    },
  ],
  compatibility: '^3.0.0',
})
export class CrowdSecPlugin {}
