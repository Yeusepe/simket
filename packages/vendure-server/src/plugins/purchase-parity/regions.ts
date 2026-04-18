/**
 * Purpose: Region definitions and country-to-region mapping for purchase parity.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model — regional pricing)
 *   - docs/domain-model.md §4.1 (Product pricing)
 * External references:
 *   - ISO 3166-1 alpha-2 country codes
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 */

/** Pre-defined geographic region groups for purchase parity pricing. */
export const REGION_GROUPS = [
  'LATAM',
  'SEA',
  'AFRICA',
  'EASTERN_EUROPE',
  'SOUTH_ASIA',
  'MIDDLE_EAST',
  'CIS',
] as const;

export type RegionGroup = (typeof REGION_GROUPS)[number];

/**
 * Mapping from ISO 3166-1 alpha-2 country codes to region groups.
 * Countries not listed here are not in any region group and receive
 * no automatic regional discount (but can still have country-specific pricing).
 */
export const COUNTRY_TO_REGION: Readonly<Record<string, RegionGroup>> = {
  // LATAM
  AR: 'LATAM', BO: 'LATAM', BR: 'LATAM', CL: 'LATAM', CO: 'LATAM',
  CR: 'LATAM', CU: 'LATAM', DO: 'LATAM', EC: 'LATAM', SV: 'LATAM',
  GT: 'LATAM', HN: 'LATAM', MX: 'LATAM', NI: 'LATAM', PA: 'LATAM',
  PY: 'LATAM', PE: 'LATAM', UY: 'LATAM', VE: 'LATAM',

  // SEA (Southeast Asia)
  BN: 'SEA', KH: 'SEA', ID: 'SEA', LA: 'SEA', MY: 'SEA',
  MM: 'SEA', PH: 'SEA', SG: 'SEA', TH: 'SEA', TL: 'SEA', VN: 'SEA',

  // AFRICA
  DZ: 'AFRICA', AO: 'AFRICA', BJ: 'AFRICA', BW: 'AFRICA', BF: 'AFRICA',
  BI: 'AFRICA', CM: 'AFRICA', CV: 'AFRICA', CF: 'AFRICA', TD: 'AFRICA',
  CI: 'AFRICA', CD: 'AFRICA', DJ: 'AFRICA', EG: 'AFRICA', GQ: 'AFRICA',
  ER: 'AFRICA', SZ: 'AFRICA', ET: 'AFRICA', GA: 'AFRICA', GM: 'AFRICA',
  GH: 'AFRICA', GN: 'AFRICA', GW: 'AFRICA', KE: 'AFRICA', LS: 'AFRICA',
  LR: 'AFRICA', LY: 'AFRICA', MG: 'AFRICA', MW: 'AFRICA', ML: 'AFRICA',
  MR: 'AFRICA', MU: 'AFRICA', MA: 'AFRICA', MZ: 'AFRICA', NA: 'AFRICA',
  NE: 'AFRICA', NG: 'AFRICA', RW: 'AFRICA', SN: 'AFRICA', SL: 'AFRICA',
  SO: 'AFRICA', ZA: 'AFRICA', SS: 'AFRICA', SD: 'AFRICA', TZ: 'AFRICA',
  TG: 'AFRICA', TN: 'AFRICA', UG: 'AFRICA', ZM: 'AFRICA', ZW: 'AFRICA',

  // EASTERN_EUROPE
  AL: 'EASTERN_EUROPE', BA: 'EASTERN_EUROPE', BG: 'EASTERN_EUROPE',
  HR: 'EASTERN_EUROPE', CZ: 'EASTERN_EUROPE', HU: 'EASTERN_EUROPE',
  MK: 'EASTERN_EUROPE', MD: 'EASTERN_EUROPE', ME: 'EASTERN_EUROPE',
  PL: 'EASTERN_EUROPE', RO: 'EASTERN_EUROPE', RS: 'EASTERN_EUROPE',
  SK: 'EASTERN_EUROPE', SI: 'EASTERN_EUROPE',

  // SOUTH_ASIA
  AF: 'SOUTH_ASIA', BD: 'SOUTH_ASIA', BT: 'SOUTH_ASIA', IN: 'SOUTH_ASIA',
  MV: 'SOUTH_ASIA', NP: 'SOUTH_ASIA', PK: 'SOUTH_ASIA', LK: 'SOUTH_ASIA',

  // MIDDLE_EAST
  BH: 'MIDDLE_EAST', IQ: 'MIDDLE_EAST', IR: 'MIDDLE_EAST', JO: 'MIDDLE_EAST',
  KW: 'MIDDLE_EAST', LB: 'MIDDLE_EAST', OM: 'MIDDLE_EAST', QA: 'MIDDLE_EAST',
  SA: 'MIDDLE_EAST', SY: 'MIDDLE_EAST', AE: 'MIDDLE_EAST', YE: 'MIDDLE_EAST',

  // CIS (Commonwealth of Independent States)
  AM: 'CIS', AZ: 'CIS', BY: 'CIS', GE: 'CIS', KZ: 'CIS',
  KG: 'CIS', RU: 'CIS', TJ: 'CIS', TM: 'CIS', UA: 'CIS', UZ: 'CIS',
};

/**
 * Resolve a country code to its region group.
 * Returns undefined if the country is not in any predefined group.
 */
export function resolveRegion(countryCode: string): RegionGroup | undefined {
  return COUNTRY_TO_REGION[countryCode.toUpperCase()];
}

/**
 * Check if a string is a valid region group identifier.
 */
export function isRegionGroup(value: string): value is RegionGroup {
  return (REGION_GROUPS as readonly string[]).includes(value);
}
