import { DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntDialogService, IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, forkJoin, Observable } from 'rxjs';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';

import { BaseResponse } from '../../models/base-response';
import {
  ServiceTimeChange,
  ServiceTimeDialogData,
  ServiceTimeModalComponent,
  ServiceTimeProduct,
} from '../components/service-time-modal/service-time-modal.component';

export interface ServingTimeWriteResult {
  servingAt: string | null;
  sessionId: number;
}

export type ServingTimeWriter = (change: ServiceTimeChange) => Observable<BaseResponse<ServingTimeWriteResult>>;

export interface ServingTimeEditRequest {
  anchorDate: string | null;
  current: ReadonlyMap<number, string>;
  products: ServiceTimeProduct[];
  write: ServingTimeWriter | null;
}

@Injectable()
export class ServingTimeEditService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);

  readonly #saving = signal(false);
  readonly saving: Signal<boolean> = this.#saving.asReadonly();

  edit(request: ServingTimeEditRequest): Observable<ReadonlyMap<number, string>> {
    if (this.#saving()) {
      return EMPTY;
    }
    const data: ServiceTimeDialogData = { anchorDate: request.anchorDate, products: request.products };
    return this.#dialogService.openModal<ServiceTimeChange[], ServiceTimeDialogData>(ServiceTimeModalComponent, { data }).closed$.pipe(
      take(1),
      switchMap(changes => this.#save(request, changes ?? [])),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  #appliedChanges(changes: ServiceTimeChange[], responses: BaseResponse<ServingTimeWriteResult>[]): ServiceTimeChange[] {
    return changes
      .map((change, index) => ({ change, response: responses[index] }))
      .filter(({ response }) => !response?.error)
      .map(({ change, response }) => ({ servingAt: response?.data?.servingAt ?? change.servingAt, sessionId: change.sessionId }));
  }

  #merge(current: ReadonlyMap<number, string>, changes: ServiceTimeChange[]): ReadonlyMap<number, string> {
    const updated = new Map(current);
    for (const { servingAt, sessionId } of changes) {
      if (servingAt) {
        updated.set(sessionId, servingAt);
      } else {
        updated.delete(sessionId);
      }
    }
    return updated;
  }

  #save(request: ServingTimeEditRequest, changes: ServiceTimeChange[]): Observable<ReadonlyMap<number, string>> {
    const write = request.write;
    if (!write || !changes.length) {
      return EMPTY;
    }

    this.#saving.set(true);
    return forkJoin(changes.map(change => write(change))).pipe(
      finalize(() => this.#saving.set(false)),
      catchError(() => {
        this.#showError();
        return EMPTY;
      }),
      map(responses => {
        const applied = this.#appliedChanges(changes, responses);
        if (applied.length !== changes.length) {
          this.#showError();
        }
        return this.#merge(request.current, applied);
      }),
    );
  }

  #showError(): void {
    this.#toastService.danger(this.#translateService.instant('cart.serviceTime.toast.errorMessage'), {
      title: this.#translateService.instant('cart.serviceTime.toast.errorTitle'),
    });
  }
}
