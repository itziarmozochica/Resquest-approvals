export interface DistributorGroupFailuresPanelData {
  group: { id: string; name: string };
  onRetryStarted?: () => void;
  partnerId: number;
}

export const FAILURES_PANEL_QUERY_PARAM = 'panel';

export const FAILURES_PANEL_QUERY_VALUE = 'failed';

export const UNEXPECTED_ERROR_REASON = 'unexpected_error';
