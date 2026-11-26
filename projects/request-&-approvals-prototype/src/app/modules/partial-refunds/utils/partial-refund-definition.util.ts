import type {
  PartialRefundDefinition,
  PartialRefundDefinitionSignals,
  PartialRefundDefinitionState,
  PartialRefundPreviewSnapshot,
} from '../models/partial-refund-definition.model';
import { partialRefundModes } from '../models/partial-refund-mode.model';
import type { PartialRefundPreview } from '../models/partial-refund-preview.model';
import { partialRefundRejectionCodes } from '../models/partial-refund-rejection.model';
import type { RequestState } from '../models/request-state.model';

type CompletePartialRefundDefinition = { readonly [K in keyof PartialRefundDefinition]: NonNullable<PartialRefundDefinition[K]> };

type PreviewablePartialRefundDefinition = Omit<CompletePartialRefundDefinition, 'reason'>;

export function definitionStateOf(state: PartialRefundDefinitionSignals): PartialRefundDefinitionState {
  return {
    doubleRefundAcknowledged: state.doubleRefundAcknowledged(),
    includeSurcharge: state.includeSurcharge(),
    job: state.job(),
    mode: state.mode(),
    preview: state.preview(),
    previewedAmount: state.previewedAmount(),
    previewedDoubleRefundAcknowledged: state.previewedDoubleRefundAcknowledged(),
    previewedIncludeSurcharge: state.previewedIncludeSurcharge(),
    previewedRate: state.previewedRate(),
    reason: state.reason(),
    value: state.value(),
  };
}

/** Every question answered, the reason included, which is what the job payload requires. */
export function isDefinitionComplete<T extends PartialRefundDefinition>(definition: T): definition is T & CompletePartialRefundDefinition {
  return definition.includeSurcharge !== null && definition.mode !== null && definition.reason !== null && definition.value !== null;
}

/** The answers the figures are worked out from. The reason is not one of them. */
export function isDefinitionPreviewable<T extends PartialRefundDefinition>(
  definition: T,
): definition is T & PreviewablePartialRefundDefinition {
  return definition.includeSurcharge !== null && definition.mode !== null && definition.value !== null;
}

export function previewSnapshotFor(definition: PartialRefundDefinition, doubleRefundAcknowledged: boolean): PartialRefundPreviewSnapshot {
  return {
    previewedAmount: definition.mode === partialRefundModes.FIXED_AMOUNT ? definition.value : null,
    previewedDoubleRefundAcknowledged: doubleRefundAcknowledged,
    previewedIncludeSurcharge: definition.includeSurcharge,
    previewedRate: definition.mode === partialRefundModes.PERCENTAGE ? definition.value : null,
  };
}

/** The figures were worked out from the rate, amount and base entered now. The acknowledgment is only checked on confirm. */
export function isPreviewCurrent(snapshot: PartialRefundPreviewSnapshot, definition: PartialRefundDefinition): boolean {
  const current = previewSnapshotFor(definition, false);
  return (
    snapshot.previewedAmount === current.previewedAmount &&
    snapshot.previewedIncludeSurcharge === current.previewedIncludeSurcharge &&
    snapshot.previewedRate === current.previewedRate
  );
}

export function isDefinitionPreviewed(
  state: PartialRefundDefinition & PartialRefundPreviewSnapshot & { readonly preview: RequestState<PartialRefundPreview> },
): boolean {
  const { preview } = state;
  return (
    isDefinitionComplete(state) && !preview.isLoading && preview.data !== null && preview.error === null && isPreviewCurrent(state, state)
  );
}

/** Tickets, not rows: what the engine will pay out on across every currency section, not what was ticked. */
export function refundTicketCount(preview: PartialRefundPreview | null): number {
  return (preview?.sections ?? []).reduce((total, section) => total + section.totals.ticketsCount, 0);
}

/** The engine left out tickets that already had money returned, until the agent accepts refunding them again. */
export function requiresDoubleRefundAcknowledgment(preview: PartialRefundPreview | null): boolean {
  return (preview?.rejections ?? []).some(rejection => rejection.code === partialRefundRejectionCodes.DOUBLE_REFUND_NOT_ACKNOWLEDGED);
}

export function canConfirmDefinition(state: PartialRefundDefinitionState): boolean {
  return (
    !state.job.isLoading &&
    state.job.data === null &&
    isDefinitionPreviewed(state) &&
    state.previewedDoubleRefundAcknowledged === state.doubleRefundAcknowledged &&
    refundTicketCount(state.preview.data) > 0
  );
}
