import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, type IgntDialogRef } from '@ignite/common';
import QRCode from 'qrcode';
import { from } from 'rxjs';

import { IconButtonComponent } from '../../icon-button/icon-button.component';

export interface KioskSerialQrModalData {
  serial: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButtonComponent],
  selector: 'app-kiosk-serial-qr-modal',
  standalone: true,
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-serial-qr-modal.component.scss'],
  templateUrl: './kiosk-serial-qr-modal.component.html',
})
export class KioskSerialQrModalComponent {
  static readonly qrSizePx = 280;
  static readonly qrMargin = 2;

  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<void>;
  readonly #destroyRef = inject(DestroyRef);
  readonly #data = inject<KioskSerialQrModalData>(IGNT_DIALOG_DATA);
  readonly serial: string = this.#data.serial;
  readonly qrDataUrl: WritableSignal<string | null> = signal(null);

  constructor() {
    from(QRCode.toDataURL(this.serial, { margin: KioskSerialQrModalComponent.qrMargin, width: KioskSerialQrModalComponent.qrSizePx }))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((url: string) => this.qrDataUrl.set(url));
  }

  close(): void {
    this.#dialogRef.close();
  }
}
