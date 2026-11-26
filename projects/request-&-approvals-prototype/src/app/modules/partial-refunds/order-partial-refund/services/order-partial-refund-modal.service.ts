import { inject, Injectable } from '@angular/core';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';

import { OrderPartialRefundShellComponent } from '../containers/order-partial-refund-shell/order-partial-refund-shell.component';
import type { OrderPartialRefundModalData } from '../models/order-partial-refund-context.model';

@Injectable({
  providedIn: 'root',
})
export class OrderPartialRefundModalService {
  readonly #dialogService = inject(IgntDialogService);

  open(data: OrderPartialRefundModalData): IgntDialogRef<MultiStepModalResult> {
    return this.#dialogService.openModal<MultiStepModalResult, OrderPartialRefundModalData>(OrderPartialRefundShellComponent, {
      data,
      disableCloseShortcuts: true,
      size: 'lg',
    });
  }
}
