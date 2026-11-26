import type { IgntSentiment } from '../../../core/models/sentiment';

/**
 * Colour intent supported by `IgntAlertComponent`.
 */
export type IgntAlertSentiment = Extract<IgntSentiment, 'accent' | 'danger' | 'info' | 'neutral' | 'positive' | 'warning'>;
