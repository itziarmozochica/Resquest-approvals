import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export interface WaitingRoomDeleteConfirmDialogData {
  readonly cancel: string;
  readonly confirm: string;
  readonly message: string;
  readonly title: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule, TranslateModule],
  selector: 'app-waiting-room-delete-confirm-dialog',
  standalone: true,
  templateUrl: './waiting-room-delete-confirm-dialog.component.html',
})
export class WaitingRoomDeleteConfirmDialogComponent {
  readonly data = inject<WaitingRoomDeleteConfirmDialogData>(IGNT_DIALOG_DATA);
}
