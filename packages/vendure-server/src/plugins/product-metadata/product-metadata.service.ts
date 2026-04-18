/**
 * Purpose: Pure functions for product metadata validation and processing.
 *
 * Handles: try-avatar URL validation, compatibility flags parsing/validation,
 * avatar ranking clamping, and known flag definitions.
 *
 * Governing docs:
 *   - docs/architecture.md §4.1 (Product entity)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.service.test.ts
 */

/**
 * Known compatibility flags for products (especially VR avatars and game assets).
 * Unknown flags are allowed but will produce a warning.
 */
export const KNOWN_COMPATIBILITY_FLAGS: readonly string[] = [
  // VR avatar tools
  'vrcfury',
  'poiyomi',
  'lilToon',
  'av3emulator',
  'gogo-loco',
  'vrc-sdk3',
  'vrc-sdk2',
  'gesture-manager',
  'd4rkAvatarOptimizer',
  // Game engines / platforms
  'unity',
  'unreal',
  'godot',
  'blender',
  // Asset formats
  'fbx',
  'vrm',
  'glb',
  'gltf',
  'unitypackage',
  // Other common tools
  'substance-painter',
  'marvelous-designer',
  'zbrush',
] as const;

/** Avatar ranking range: 0 (unranked) to 5 (best). */
const MIN_AVATAR_RANKING = 0;
const MAX_AVATAR_RANKING = 5;

/**
 * Validate a try-avatar URL. Returns an error message or undefined if valid.
 * Empty/null values are accepted (field is optional).
 */
export function validateTryAvatarUrl(value: string | null | undefined): string | undefined {
  if (!value || value.trim().length === 0) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'tryAvatarUrl must use http or https protocol';
    }
    return undefined;
  } catch {
    return 'tryAvatarUrl must be a valid URL';
  }
}

/**
 * Parse a comma-separated compatibility flags string into an array.
 */
export function parseCompatibilityFlags(value: string | null | undefined): string[] {
  if (!value || value.trim().length === 0) return [];
  return value
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Validate compatibility flags — unknown flags produce warnings (not errors).
 * All flags are allowed; we just inform creators about unrecognized ones.
 */
export function validateCompatibilityFlags(flags: string[]): {
  valid: boolean;
  unknownFlags: string[];
} {
  const unknownFlags = flags.filter(
    (f) => !KNOWN_COMPATIBILITY_FLAGS.includes(f),
  );
  return { valid: true, unknownFlags };
}

/**
 * Clamp and round an avatar ranking to the valid range [0, 5].
 */
export function clampAvatarRanking(value: number): number {
  if (!Number.isFinite(value)) return MIN_AVATAR_RANKING;
  return Math.min(MAX_AVATAR_RANKING, Math.max(MIN_AVATAR_RANKING, Math.round(value)));
}
