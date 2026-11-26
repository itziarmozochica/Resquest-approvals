import { computed, DestroyRef, inject, Injectable, Injector, signal, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IgntDialogService } from '@ignite/common';
import { take } from 'rxjs';

import { PosPartyIntentService } from '../../../services/party/pos-party-intent.service';
import { PosTicketSelectorStore } from '../../../store/pos-ticket-selector.store';
import { PosPartyHandheldModalShellComponent } from '../containers/pos-party-handheld-modal-shell/pos-party-handheld-modal-shell.component';
import {
  POS_PARTY_HANDHELD_SHEET,
  type PosPartyHandheldModalData,
  type PosPartyHandheldSheet,
} from '../models/pos-party-handheld-modal.model';

/**
 * Opens the header sheets with the Point of Sale injector, so the steps resolve the POS stores and services,
 * and refuses a second sheet while one is up. The date sheet previews its picks live, so a close that is not
 * Apply puts back the window, the day and the hour it opened on. Registered by `providePointOfSale()`.
 */
@Injectable()
export class PosPartyHandheldModalService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #openSheet = signal<PosPartyHandheldSheet | null>(null);
  readonly #party = inject(PosTicketSelectorStore);
  readonly #partyIntent = inject(PosPartyIntentService);
  readonly isOpen: Signal<boolean> = computed(() => this.#openSheet() !== null);

  openDate(): void {
    if (this.isOpen()) {
      return;
    }

    const snapshot = this.#partyIntent.dateSnapshot();

    this.#open(POS_PARTY_HANDHELD_SHEET.Date, (result: MultiStepModalResult | undefined) => {
      if (result?.completed !== true) {
        this.#partyIntent.restoreDate(snapshot);
      }
    });
  }

  openPartyMembers(): void {
    if (this.isOpen()) {
      return;
    }

    this.#open(POS_PARTY_HANDHELD_SHEET.Party, () => undefined);
  }

  #open(sheet: PosPartyHandheldSheet, onClosed: (result: MultiStepModalResult | undefined) => void): void {
    const dialogRef = this.#dialogService.openModal<MultiStepModalResult, PosPartyHandheldModalData>(PosPartyHandheldModalShellComponent, {
      data: { quantities: this.#party.partyQuantities(), sheet },
      injector: this.#injector,
      size: 'sm',
    });

    this.#openSheet.set(sheet);
    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((result: MultiStepModalResult | undefined) => {
      this.#openSheet.set(null);
      onClosed(result);
    });
  }
}
