import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { NfcSuccessAnimationComponent } from '../../../../../shared/components/nfc-success-animation/nfc-success-animation.component';
import { MobilePosNfcCardReadFailure } from '../../enums/mobile-pos-nfc-card-read-failure.enum';
import { MobilePosNfcCardReadError } from '../../models/mobile-pos-nfc-card-read-error.model';
import { MobilePosNfcCardReadService } from '../../services/mobile-pos-nfc-card-read.service';
import { NfcInfoModalData } from './nfc-info-modal-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, NfcSuccessAnimationComponent],
  selector: 'app-nfc-info-modal',
  standalone: true,
  styleUrls: ['./nfc-info-modal.component.scss'],
  templateUrl: './nfc-info-modal.component.html',
})
export class NfcInfoModalComponent {
  #dialog = inject<DialogRef<string, NfcInfoModalComponent>>(DialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #failureMessageKeys: Readonly<Record<MobilePosNfcCardReadFailure, string>> = {
    [MobilePosNfcCardReadFailure.NoCardDetected]: 'login.nfc.mobilePos.noCardDetected',
    [MobilePosNfcCardReadFailure.NotAvailable]: 'login.nfc.mobilePos.notAvailable',
    [MobilePosNfcCardReadFailure.ReadFailed]: 'login.nfc.mobilePos.readFailed',
  };
  #isReadPending = false;
  readonly #mobilePosNfcCardReadService = inject(MobilePosNfcCardReadService);
  readonly #mobilePosSerial: string | null = inject<NfcInfoModalData | null>(DIALOG_DATA)?.mobilePosSerial ?? null;
  readonly #translate = inject(TranslateService);
  readonly isMobilePos: boolean = this.#mobilePosSerial !== null;
  readonly instructionsKey: string = this.isMobilePos ? 'login.nfc.tapCardOnMobilePos' : 'login.nfc.bringCardCloseToSecondScreen';

  constructor() {
    if (this.#mobilePosSerial !== null) {
      this.#readCard(this.#mobilePosSerial);
    }
  }

  close(): void {
    this.#dialog.close();
  }

  #readCard(mobilePosSerial: string): void {
    const serviceId: string = this.#mobilePosNfcCardReadService.createServiceId();
    this.#isReadPending = true;
    this.#destroyRef.onDestroy(() => {
      if (this.#isReadPending) {
        this.#mobilePosNfcCardReadService.cancel(mobilePosSerial, serviceId).subscribe();
      }
    });
    this.#mobilePosNfcCardReadService
      .read(mobilePosSerial, serviceId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: MobilePosNfcCardReadError) => {
          this.#isReadPending = false;
          this.#dialog.close();
          this.#dialogService.openMessageModal(
            this.#translate.instant('common.errorTitle'),
            this.#translate.instant(this.#failureMessageKeys[error.failure]),
          );
        },
        next: (nfcUid: string) => {
          this.#isReadPending = false;
          this.#dialog.close(nfcUid);
        },
      });
  }
}
