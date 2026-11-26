import { computed, inject, Injectable, signal } from '@angular/core';
import { FormControl } from '@angular/forms';

import { DeclarativeInventoryNonConformityError } from '@fz-original/app/modules/event-settings/models/declarative-inventory-non-conformity-error.model';
import {
  DeclarativeInventoryNonConformity,
  DeclarativeInventorySectionState,
  DeclarativeInventoryStatus,
} from '@fz-original/app/modules/event-settings/models/declarative-inventory.model';
import { DeclarativeInventoryService } from '@fz-original/app/modules/event-settings/services/declarative-inventory/declarative-inventory.service';
import { catchError, finalize, map, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeclarativeInventorySettingsFacade {
  readonly #declarativeInventoryService = inject(DeclarativeInventoryService);

  readonly #hasLoadFailed = signal(false);
  readonly #isLoading = signal(false);
  readonly #nonConformities = signal<DeclarativeInventoryNonConformity[]>([]);

  readonly sectionState = computed<DeclarativeInventorySectionState>(() => ({
    hasLoadFailed: this.#hasLoadFailed(),
    isLoading: this.#isLoading(),
    nonConformities: this.#nonConformities(),
  }));

  loadDeclarativeInventory(partnerId: number, planId: number, control: FormControl<boolean> | null): Observable<void> {
    this.#hasLoadFailed.set(false);
    this.#nonConformities.set([]);

    if (control === null) {
      return of(void 0);
    }

    this.#isLoading.set(true);

    return this.#declarativeInventoryService.getDeclarativeInventoryStatus(partnerId, planId).pipe(
      map((hasDeclarativeInventory: boolean): void => {
        control.reset(hasDeclarativeInventory, { emitEvent: false });
      }),
      catchError(() => {
        this.#hasLoadFailed.set(true);
        return of(void 0);
      }),
      finalize(() => this.#isLoading.set(false)),
    );
  }

  syncDeclarativeInventoryIfDirty(partnerId: number, planId: number, control: FormControl<boolean> | null): Observable<void> {
    if (control === null || !control.dirty) {
      return of(void 0);
    }

    this.#nonConformities.set([]);

    return this.#declarativeInventoryService.updateDeclarativeInventory(partnerId, planId, control.value).pipe(
      map((status: DeclarativeInventoryStatus): void => {
        control.reset(status.hasDeclarativeInventory, { emitEvent: false });
        this.#nonConformities.set(status.nonConformities);

        if (status.nonConformities.length > 0) {
          throw new DeclarativeInventoryNonConformityError();
        }
      }),
    );
  }
}
