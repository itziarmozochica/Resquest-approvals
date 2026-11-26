import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MultiStepModalShellComponent } from '@fz-original/app/shared/multi-step-modal/containers/multi-step-modal-shell/multi-step-modal-shell.component';
import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import {
  MULTI_STEP_MODAL_CONFIG,
  MULTI_STEP_MODAL_CONTROLLER,
} from '@fz-original/app/shared/multi-step-modal/tokens/multi-step-modal.token';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, type IgntDialogRef } from '@ignite/common';

import { PosPartyIntentService } from '../../../../services/party/pos-party-intent.service';
import { posPartyHandheldModalConfig } from '../../config/pos-party-handheld-modal.config';
import { POS_PARTY_HANDHELD_SHEET, type PosPartyHandheldModalData } from '../../models/pos-party-handheld-modal.model';
import { PosPartyHandheldModalStore } from '../../store/pos-party-handheld-modal.store';

/**
 * Thin host for both header sheets: scopes the store to the sheet, hands the shell the config of the sheet it
 * was opened as, and commits the party draft when the party sheet closes `{ completed: true }` (Apply); Cancel
 * leaves the store untouched. Unencapsulated styles: the bottom-sheet rules target the Ignite dialog shell,
 * this component's parent, through `:has()`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [MultiStepModalShellComponent],
  providers: [
    {
      provide: MULTI_STEP_MODAL_CONFIG,
      useFactory: () => posPartyHandheldModalConfig(inject<PosPartyHandheldModalData>(IGNT_DIALOG_DATA).sheet),
    },
    PosPartyHandheldModalStore,
    { provide: MULTI_STEP_MODAL_CONTROLLER, useExisting: PosPartyHandheldModalStore },
  ],
  selector: 'pos-party-handheld-modal-shell',
  styleUrl: './pos-party-handheld-modal-shell.component.scss',
  templateUrl: './pos-party-handheld-modal-shell.component.html',
})
export class PosPartyHandheldModalShellComponent {
  readonly #data = inject<PosPartyHandheldModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<MultiStepModalResult>>(IGNT_DIALOG_REF);
  readonly #partyIntent = inject(PosPartyIntentService);
  readonly #store = inject(PosPartyHandheldModalStore);

  constructor() {
    this.#dialogRef.closed$.pipe(takeUntilDestroyed()).subscribe((result: MultiStepModalResult | undefined) => {
      if (result?.completed === true && this.#data.sheet === POS_PARTY_HANDHELD_SHEET.Party) {
        this.#partyIntent.commitDraft(this.#store.draftQuantities());
      }
    });
  }
}
