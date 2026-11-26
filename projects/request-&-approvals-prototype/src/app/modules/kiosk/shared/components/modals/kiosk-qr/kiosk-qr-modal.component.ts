import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IdleService } from '../../../../services/idle/idle.service';
import { KioskStorageService } from '../../../../services/kiosk-storage.service';
import { KioskQRService } from '../../../../services/qr/kiosk-qr.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kiosk-qr-modal',
  standalone: false,
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-qr-modal.component.scss'],
  templateUrl: './kiosk-qr-modal.component.html',
})
export class KioskQrModalComponent implements OnInit {
  readonly #data = inject(DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DialogRef);
  readonly #idleService: IdleService = inject(IdleService);
  readonly #kioskQrService: KioskQRService = inject(KioskQRService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #translate: TranslateService = inject(TranslateService);
  protected readonly countDownMessage = signal('');
  protected readonly code = signal('');
  timeUntilTimeout = 0;

  ngOnInit(): void {
    this.#idleService
      .get(1, 30, false)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#dialogRef.close());
    this.#data.countdown.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((time: number) => {
      this.timeUntilTimeout = time;
      this.countDownMessage.set(
        this.#translate.instant('kiosk.ticketModal.qr.timeout', {
          amount: time,
        }),
      );
    });
    this.#generateQR()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((code: string) => {
        this.code.set(code);
      });
  }

  closeTicketModal(): void {
    this.#dialogRef.close();
  }

  qrNeedsMoreTime(): void {
    this.#idleService.reset();
  }

  #generateQR(): Observable<string> {
    return this.#kioskQrService.generateQr({
      onsiteSetupId: this.#kioskStorageService.getConfiguration()?.onsiteSetupId,
      order: this.#data.order,
      partnerId: this.#data.partnerId,
    });
  }
}
