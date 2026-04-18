export { SettlementPlugin } from './settlement.plugin.js';
export {
  calculateCollaboratorSplits,
  validateSplitConfiguration,
  buildPayoutParams,
  SettlementError,
} from './settlement.service.js';
export type {
  CollaboratorShare,
  PayoutTarget,
  SettlementResult,
  SplitValidation,
} from './settlement.service.js';
