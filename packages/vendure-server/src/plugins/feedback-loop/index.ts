export {
  FeedbackSignalType,
  validateFeedbackSignal,
  calculateSignalWeight,
  buildFeedbackPayload,
  deduplicateSignals,
} from './feedback-loop.service.js';
export type {
  FeedbackSignal,
  FeedbackValidation,
  FeedbackPayload,
} from './feedback-loop.service.js';
