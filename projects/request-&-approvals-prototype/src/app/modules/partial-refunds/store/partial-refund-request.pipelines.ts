import { EMPTY, timer, type Observable, type OperatorFunction } from 'rxjs';
import { catchError, exhaustMap, switchMap, tap } from 'rxjs/operators';

import type {
  PartialRefundDefinitionState,
  PartialRefundPreviewSnapshot,
  PartialRefundRequestInput,
} from '../models/partial-refund-definition.model';
import type { PartialRefundJob } from '../models/partial-refund-job.model';
import type { PartialRefundPreview } from '../models/partial-refund-preview.model';
import type { PartialRefundApiService } from '../services/partial-refund-api.service';
import {
  canConfirmDefinition,
  isDefinitionComplete,
  isDefinitionPreviewable,
  previewSnapshotFor,
} from '../utils/partial-refund-definition.util';

const previewDebounceMs = 400;

/** Where a store keeps its preview: the pipeline never touches state itself. */
export interface PartialRefundPreviewWriter {
  failed(error: unknown): void;
  idle(): void;
  /** False once something cleared the preview, which marks the request in flight as stale. */
  isStillLoading(): boolean;
  loading(): void;
  succeeded(preview: PartialRefundPreview, snapshot: PartialRefundPreviewSnapshot): void;
}

export interface PartialRefundPreviewPipelineOptions {
  readonly api: Pick<PartialRefundApiService, 'getPreview'>;
  readonly write: PartialRefundPreviewWriter;
  /** `null` while there is nothing to refund yet, which leaves the preview empty. */
  readonly read: () => PartialRefundRequestInput | null;
}

export interface PartialRefundConfirmWriter {
  failed(error: unknown): void;
  loading(): void;
  succeeded(job: PartialRefundJob): void;
  /** The guard turned the job down before it left; a flow that cannot be left on its own answers it. */
  refused?(): void;
}

export interface PartialRefundConfirmPipelineOptions {
  readonly api: Pick<PartialRefundApiService, 'createJob'>;
  readonly write: PartialRefundConfirmWriter;
  /** `null` while there is nothing to refund yet; whether it may be sent is the pipeline's call. */
  readonly read: () => PartialRefundRequestInput | null;
  /** What `canConfirmDefinition` judges, so no store has to remember to ask it before sending. */
  readonly state: () => PartialRefundDefinitionState;
}

/**
 * Latest wins. With an answer missing the preview goes empty instead of asking. Otherwise it is marked
 * as loading at once, so outdated figures show as updating for the whole debounce, and each new ask
 * cancels the request in flight so an old answer cannot land mid-wait. The answers are snapshotted with
 * the figures they produced.
 */
export function partialRefundPreviewPipeline({
  api,
  read,
  write,
}: PartialRefundPreviewPipelineOptions): OperatorFunction<void, PartialRefundPreview> {
  return switchMap((): Observable<PartialRefundPreview> => {
    const asked = read();
    if (asked === null || !isDefinitionPreviewable(asked.definition)) {
      write.idle();
      return EMPTY;
    }

    write.loading();
    return timer(previewDebounceMs).pipe(
      switchMap((): Observable<PartialRefundPreview> => {
        // Read again: the answers may have moved on while the wait ran.
        const input = read();
        if (input === null || !isDefinitionPreviewable(input.definition)) {
          write.idle();
          return EMPTY;
        }
        // A new selection clears the preview without asking again, so mark it once more.
        if (!write.isStillLoading()) {
          write.loading();
        }

        const { criteria, doubleRefundAcknowledged, partnerId } = input;
        const { includeSurcharge, mode, value } = input.definition;
        const snapshot = previewSnapshotFor(input.definition, doubleRefundAcknowledged);
        return api.getPreview(partnerId, { criteria, doubleRefundAcknowledged, includeSurcharge, mode, value }).pipe(
          // Whatever clears the preview (a new selection, stepping back) leaves this request running.
          // Only the request still marked as loading is the one the screen is waiting for.
          tap(preview => {
            if (write.isStillLoading()) {
              write.succeeded(preview, snapshot);
            }
          }),
          catchError((error: unknown) => {
            if (write.isStillLoading()) {
              write.failed(error);
            }
            return EMPTY;
          }),
        );
      }),
    );
  });
}

/**
 * The one call that moves money. `exhaustMap`, not `switchMap`: cancelling the subscription would not
 * cancel a refund the engine already accepted, so a second press in flight is swallowed. Once a job is
 * accepted `exhaustMap` takes presses again, which is why the pipeline checks `canConfirmDefinition`
 * itself instead of trusting the store.
 */
export function partialRefundConfirmPipeline({
  api,
  read,
  state,
  write,
}: PartialRefundConfirmPipelineOptions): OperatorFunction<void, PartialRefundJob> {
  return exhaustMap((): Observable<PartialRefundJob> => {
    const input = read();
    if (input === null || !isDefinitionComplete(input.definition) || !canConfirmDefinition(state())) {
      write.refused?.();
      return EMPTY;
    }

    const { criteria, definition, doubleRefundAcknowledged, partnerId } = input;
    const { includeSurcharge, mode, reason, value } = definition;
    write.loading();
    return api.createJob(partnerId, { criteria, doubleRefundAcknowledged, includeSurcharge, mode, reason, value }).pipe(
      tap(job => write.succeeded(job)),
      catchError((error: unknown) => {
        write.failed(error);
        return EMPTY;
      }),
    );
  });
}
