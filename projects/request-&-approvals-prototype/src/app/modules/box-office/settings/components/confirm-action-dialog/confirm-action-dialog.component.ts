import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntButtonSentiment,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { IgntIconComponent, IgntIconName } from '@ignite/icon';

import { CONFIRM_ACTION_ICONS, ConfirmActionDialogData } from './confirm-action-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntIconComponent,
  ],
  selector: 'app-confirm-action-dialog',
  styleUrl: './confirm-action-dialog.component.scss',
  templateUrl: './confirm-action-dialog.component.html',
})
export class ConfirmActionDialogComponent {
  protected readonly data = inject<ConfirmActionDialogData>(IGNT_DIALOG_DATA);
  protected readonly icon: IgntIconName = CONFIRM_ACTION_ICONS[this.data.kind];
  protected readonly sentiment: IgntButtonSentiment = this.data.kind === 'duplicate' ? 'brand' : 'danger';
}
