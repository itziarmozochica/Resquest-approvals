import type { Signal } from '@angular/core';

import { requestIdle } from '../utils/request-state.util';
import type { PartialRefundCriteria } from './partial-refund-criteria.model';
import type { PartialRefundJob } from './partial-refund-job.model';
import type { PartialRefundMode } from './partial-refund-mode.model';
import type { PartialRefundPreview } from './partial-refund-preview.model';
import type { PartialRefundReason } from './partial-refund-reason.model';
import type { RequestState } from './request-state.model';

/** The three questions a partial refund asks, plus why. Each is `null` until answered: nothing is chosen for the agent. */
export interface PartialRefundDefinition {
  readonly includeSurcharge: boolean | null;
  readonly mode: PartialRefundMode | null;
  readonly reason: PartialRefundReason | null;
  readonly value: number | null;
}

/**
 * What the current preview was worked out from, captured when the request left and recorded when it
 * answered. Read live instead, the inputs would race the debounce and describe the figures wrongly.
 */
export interface PartialRefundPreviewSnapshot {
  readonly previewedAmount: number | null;
  readonly previewedDoubleRefundAcknowledged: boolean | null;
  readonly previewedIncludeSurcharge: boolean | null;
  readonly previewedRate: number | null;
}

export interface PartialRefundDefinitionState extends PartialRefundDefinition, PartialRefundPreviewSnapshot {
  readonly doubleRefundAcknowledged: boolean;
  /** Answering means money is on its way: there is no endpoint to ask how the job went. */
  readonly job: RequestState<PartialRefundJob>;
  readonly preview: RequestState<PartialRefundPreview>;
}

export type PartialRefundDefinitionSignals = {
  readonly [K in keyof PartialRefundDefinitionState]: Signal<PartialRefundDefinitionState[K]>;
};

export const emptyPreviewSnapshot: PartialRefundPreviewSnapshot = {
  previewedAmount: null,
  previewedDoubleRefundAcknowledged: null,
  previewedIncludeSurcharge: null,
  previewedRate: null,
};

/** Every input the figures were worked out from is dropped with them, so nothing can vouch for a stale answer. */
export const clearedPreview: Pick<PartialRefundDefinitionState, keyof PartialRefundPreviewSnapshot | 'preview'> = {
  ...emptyPreviewSnapshot,
  preview: requestIdle<PartialRefundPreview>(),
};

export const initialPartialRefundDefinitionState: PartialRefundDefinitionState = {
  ...emptyPreviewSnapshot,
  doubleRefundAcknowledged: false,
  includeSurcharge: null,
  job: requestIdle<PartialRefundJob>(),
  mode: null,
  preview: requestIdle<PartialRefundPreview>(),
  reason: null,
  value: null,
};

export interface PartialRefundRequestInput {
  readonly criteria: PartialRefundCriteria;
  readonly definition: PartialRefundDefinition;
  readonly doubleRefundAcknowledged: boolean;
  readonly partnerId: number;
}
