/**
 * Purpose: Barrel export for the AB testing plugin package.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 */
export { AbTestingPlugin } from './ab-testing.plugin.js';
export {
  AbTestingService,
  computeDeterministicVariant,
  isExperimentActive,
  matchesAudienceRules,
  normalizeVariants,
} from './ab-testing.service.js';
export type {
  CreateExperimentInput,
  ExperimentVariantAssignment,
  ExperimentVariantMetrics,
} from './ab-testing.service.js';
export {
  ExperimentEntity,
  ExperimentResultEntity,
  isExperimentEvent,
  isExperimentStatus,
} from './experiment.entity.js';
export type {
  ExperimentAudienceRules,
  ExperimentEvent,
  ExperimentStatus,
  ExperimentVariantDefinition,
} from './experiment.entity.js';
