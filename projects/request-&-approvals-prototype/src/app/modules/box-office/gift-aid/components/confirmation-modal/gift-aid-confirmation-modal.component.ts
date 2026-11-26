import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { GiftAidConfirmationModalData } from '../../models/gift-aid-confirmation-modal.model';

@Component({
  selector: 'app-gift-aid-confirmation-modal',
  templateUrl: './gift-aid-confirmation-modal.component.html',
  styleUrls: ['./gift-aid-confirmation-modal.component.scss'],
  standalone: true,
  imports: [NgIf, TranslateModule, IgntButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftAidConfirmationModalComponent {
  #dialog: DialogRef<boolean> = inject(DialogRef);
  data: GiftAidConfirmationModalData = inject(DIALOG_DATA);

  onCancel(): void {
    this.#dialog.close(false);
  }

  onConfirm(): void {
    this.#dialog.close(true);
  }
}
