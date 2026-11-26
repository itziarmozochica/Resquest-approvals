import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  type CouponCodeModalData,
  type CouponCodeModalResult,
} from '@fz-original/app/shared/components/coupon-code-selector/coupon-modals.model';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogCloseDirective, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'coupon-code-modal',
  },
  imports: [IgntDialogCloseDirective, IgntDialogModule, IgntIconButtonComponent, SharedComponentsModule, TranslateModule],
  selector: 'app-coupon-code-modal',
  standalone: true,
  styleUrls: ['./coupon-code-modal.component.scss'],
  templateUrl: './coupon-code-modal.component.html',
})
export class CouponCodeModalComponent {
  readonly #dialogData = inject<CouponCodeModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<CouponCodeModalResult>>(IGNT_DIALOG_REF);

  protected readonly error = this.#dialogData.error;
  protected readonly hasNavigation = this.#dialogData.hasNavigation ?? false;
  protected readonly inputCode = this.#dialogData.inputCode;
  protected readonly scannedCode = this.#dialogData.scannedCode;
  protected readonly subtitleKey = this.#dialogData.subtitleKey ?? 'boxOffice.couponModal.subtitle';
  protected readonly title = this.#dialogData.title;

  emitCouponCode(emittedCode: string): void {
    this.#dialogData.couponCode$.next({
      code: emittedCode,
      lazyCouponType: this.#dialogData.lazyCouponType,
    });
  }

  protected onScannerOpen(): void {
    this.#dialogRef.close('Open scanner');
  }
}
