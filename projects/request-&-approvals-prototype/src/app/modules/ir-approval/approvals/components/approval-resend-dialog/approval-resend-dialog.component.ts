import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export interface ResendDialogItem {
  id: string;
  label: string;
}

export interface ResendDialogData {
  items: ResendDialogItem[];
}

export type ResendDialogResult = string[];

@Component({
  selector: 'app-approval-resend-dialog',
  templateUrl: './approval-resend-dialog.component.html',
  styleUrls: ['./approval-resend-dialog.component.scss'],
  imports: [TranslateModule, IgntDialogModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalResendDialogComponent {
  readonly data = inject<ResendDialogData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<ResendDialogResult>;

  // Rejected rows are pre-selected: resending all of them is the common case.
  readonly selectedIds = signal<ReadonlySet<string>>(new Set(this.data.items.map(item => item.id)));

  isSelected(itemId: string): boolean {
    return this.selectedIds().has(itemId);
  }

  toggle(itemId: string, selected: boolean): void {
    const next = new Set(this.selectedIds());
    if (selected) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    this.selectedIds.set(next);
  }

  selectedCount(): number {
    return this.selectedIds().size;
  }

  confirm(): void {
    if (this.selectedCount() === 0) {
      return;
    }
    this.#dialogRef.close([...this.selectedIds()]);
  }

  cancel(): void {
    this.#dialogRef.close();
  }
}
