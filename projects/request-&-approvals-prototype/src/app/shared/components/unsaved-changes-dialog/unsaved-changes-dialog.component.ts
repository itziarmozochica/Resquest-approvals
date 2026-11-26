import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';

export interface UnsavedChangesDialogData {
  acceptLabel: string;
  cancelLabel: string;
  message: string;
  title: string;
  isDestructive?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule],
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  styleUrl: './unsaved-changes-dialog.component.scss',
  templateUrl: './unsaved-changes-dialog.component.html',
})
export class UnsavedChangesDialogComponent {
  protected readonly data = inject<UnsavedChangesDialogData>(IGNT_DIALOG_DATA);
}
