import { inject, Injectable } from '@angular/core';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';

import { AgreementSigningModalShellComponent } from '../containers/agreement-signing-modal-shell/agreement-signing-modal-shell.component';
import type { AgreementSigningModalData } from '../models/agreement-signing-modal.model';

@Injectable({
  providedIn: 'root',
})
export class AgreementSigningModalService {
  readonly #dialogService = inject(IgntDialogService);

  open(data: AgreementSigningModalData): IgntDialogRef<MultiStepModalResult> {
    // `md` rather than `lg`: the shell narrows the dialog to the B2C reading column anyway, and this
    // keeps the fallback closer to it on the breakpoints the override does not cover.
    return this.#dialogService.openModal<MultiStepModalResult, AgreementSigningModalData>(AgreementSigningModalShellComponent, {
      data,
      size: 'md',
    });
  }
}
