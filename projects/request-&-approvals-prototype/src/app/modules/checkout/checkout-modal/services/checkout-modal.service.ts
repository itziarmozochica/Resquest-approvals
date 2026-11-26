import { inject, Injectable } from '@angular/core';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';

import { CheckoutModalShellComponent } from '../containers/checkout-modal-shell/checkout-modal-shell.component';
import type { CheckoutModalData } from '../models/checkout.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutModalService {
  readonly #dialogService = inject(IgntDialogService);

  open(data: CheckoutModalData): IgntDialogRef<MultiStepModalResult> {
    return this.#dialogService.openModal<MultiStepModalResult, CheckoutModalData>(CheckoutModalShellComponent, {
      data,
      disableCloseShortcuts: true,
      size: 'lg',
    });
  }
}
