import { A11yModule } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export type OssModifyOrderValidationModalMode = 'info' | 'confirm';

export interface OssModifyOrderValidationModalData {
  message: string;
  title: string;
  alertTitle?: string;
  mode?: OssModifyOrderValidationModalMode;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, IgntAlertComponent, IgntButtonComponent, TranslateModule],
  selector: 'app-oss-modify-order-validation-modal',
  standalone: true,
  styleUrls: ['./oss-modify-order-validation-modal.component.scss'],
  templateUrl: './oss-modify-order-validation-modal.component.html',
})
export class OssModifyOrderValidationModalComponent {
  #dialogRef = inject(DialogRef<boolean | void>);

  data: OssModifyOrderValidationModalData = inject(DIALOG_DATA);

  onCancel(): void {
    this.#dialogRef.close(false);
  }

  onClose(): void {
    if (this.isConfirmMode) {
      this.onCancel();
      return;
    }
    this.#dialogRef.close();
  }

  onConfirm(): void {
    this.#dialogRef.close(true);
  }

  protected get isConfirmMode(): boolean {
    return (this.data.mode ?? 'info') === 'confirm';
  }
}
