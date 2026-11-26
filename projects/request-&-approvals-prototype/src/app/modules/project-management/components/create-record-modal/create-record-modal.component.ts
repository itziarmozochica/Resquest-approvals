import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { CreateRecordModalData, CreateRecordModalResult, CreateRecordType } from './create-record-modal.model';

@Component({
  selector: 'app-create-record-modal',
  templateUrl: './create-record-modal.component.html',
  styleUrls: ['./create-record-modal.component.scss'],
  imports: [TranslateModule, IgntDialogModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRecordModalComponent {
  readonly data = inject<CreateRecordModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<CreateRecordModalResult>;

  choose(type: CreateRecordType): void {
    this.#dialogRef.close({ type });
  }
}
