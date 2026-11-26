import { DestroyRef, effect, EffectRef, inject, Injectable, Injector, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KioskTerminalPairingService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #kioskStateService = inject(KioskStateService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #paymentService = inject(PaymentService);

  readonly #kioskDataReady = this.#kioskStateService.getStateProp('kioskDataReady');
  #effectRef: EffectRef | null = null;

  start(): void {
    if (this.#effectRef !== null) {
      return;
    }
    this.#effectRef = effect(
      onCleanup => {
        this.#kioskDataReady();
        untracked(() => {
          if (!this.#kioskDataReady()) {
            return;
          }
          const inFlight = this.#pairIfPayHere();
          if (inFlight !== null) {
            onCleanup(() => inFlight.unsubscribe());
          }
        });
      },
      { injector: this.#injector },
    );
  }

  #pairIfPayHere(): Subscription | null {
    const configuration = this.#kioskStorageService.getConfiguration();
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    const partner = this.#partnerService.getPartner();
    if (configuration === null || onsiteSetup === null || partner === null) {
      return null;
    }
    if (onsiteSetup.kiosk_payment_gateway !== (PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET)) {
      return null;
    }
    return this.#paymentService
      .pairPayHere(partner.id, configuration.paymentTerminalId, configuration.serial, onsiteSetup.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }
}
