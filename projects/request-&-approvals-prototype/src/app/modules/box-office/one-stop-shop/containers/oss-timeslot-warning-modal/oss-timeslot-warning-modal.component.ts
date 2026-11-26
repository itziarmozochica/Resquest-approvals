import { A11yModule } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export interface OssTimeslotWarningModalData {
  newlySelectedDatetime: string;
  title: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, TranslateModule, IgntButtonComponent, IgntAlertComponent],
  selector: 'app-oss-timeslot-warning-modal',
  standalone: true,
  styleUrls: ['./oss-timeslot-warning-modal.component.scss'],
  templateUrl: './oss-timeslot-warning-modal.component.html',
})
export class OssTimeslotWarningModalComponent {
  #dialogRef = inject(DialogRef<boolean>);

  data: OssTimeslotWarningModalData = inject(DIALOG_DATA);

  onContinue(): void {
    this.#dialogRef.close(true);
  }

  onReviewCart(): void {
    this.#dialogRef.close(false);
  }
}
