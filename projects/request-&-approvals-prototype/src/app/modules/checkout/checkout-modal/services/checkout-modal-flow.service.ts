import { inject, Injectable } from '@angular/core';

import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import type { Money } from '@fz-original/app/shared/models/money.model';
import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import type { IgntDialogRef } from '@ignite/common';
import { type Observable } from 'rxjs';
import { map, take, takeUntil, tap } from 'rxjs/operators';

import type { CheckoutCartItem } from '../models/checkout-cart-item.model';
import type { CheckoutPaymentLinkOption } from '../models/checkout-payment-link.model';
import type {
  CheckoutCashCaptureMode,
  CheckoutFlowKind,
  CheckoutFlowType,
  CheckoutPaymentMethodDescriptor,
  CheckoutPreselectedMethod,
  CheckoutTerminalOption,
} from '../models/checkout.model';
import { CheckoutModalService } from './checkout-modal.service';
import { CheckoutPaymentOrchestratorService } from './checkout-payment-orchestrator/checkout-payment-orchestrator.service';

export interface OpenCheckoutModalParams {
  availableMethods: CheckoutPaymentMethodDescriptor[];
  availableTerminals: CheckoutTerminalOption[];
  basePaymentConfiguration: PaymentConfiguration;
  cartTotal: Money;
  locale: string;
  cartItems?: CheckoutCartItem[];
  cashCaptureMode?: CheckoutCashCaptureMode;
  checkoutFlows?: CheckoutFlowType[];
  fitToTiles?: boolean;
  flow?: CheckoutFlowKind;
  paymentLink?: CheckoutPaymentLinkOption | null;
  preselectedMethod?: CheckoutPreselectedMethod;
  selectedTerminalId: string | null;
  tapToPay?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutModalFlowService {
  readonly #checkoutModalService = inject(CheckoutModalService);
  readonly #orchestrator = inject(CheckoutPaymentOrchestratorService);
  #activeDialogRef: IgntDialogRef<MultiStepModalResult> | null = null;

  dismissActiveModal(): void {
    const dialogRef = this.#activeDialogRef;
    if (dialogRef === null) {
      return;
    }
    this.#activeDialogRef = null;
    dialogRef.close({ completed: false });
  }

  openAndAwaitMethod(params: OpenCheckoutModalParams): Observable<PaymentType> {
    this.#orchestrator.beginSession();

    const dialogRef = this.#checkoutModalService.open({
      availableMethods: params.availableMethods,
      availableTerminals: params.availableTerminals,
      basePaymentConfiguration: params.basePaymentConfiguration,
      cartItems: params.cartItems,
      cartTotal: params.cartTotal,
      cashCaptureMode: params.cashCaptureMode,
      checkoutFlows: params.checkoutFlows,
      fitToTiles: params.fitToTiles,
      flow: params.flow,
      locale: params.locale,
      paymentLink: params.paymentLink ?? null,
      preselectedMethod: params.preselectedMethod,
      selectedTerminalId: params.selectedTerminalId,
      tapToPay: params.tapToPay,
    });
    this.#activeDialogRef = dialogRef;

    dialogRef.closed$
      .pipe(
        take(1),
        tap(result => {
          if (result?.completed === true) {
            this.#orchestrator.notifyModalClosed();
          }
        }),
      )
      .subscribe(() => {
        if (this.#activeDialogRef === dialogRef) {
          this.#activeDialogRef = null;
        }
        this.#orchestrator.reset();
      });

    return this.#orchestrator.methodSelected$.pipe(
      map(request => request.paymentType),
      take(1),
      takeUntil(dialogRef.closed$),
    );
  }
}
