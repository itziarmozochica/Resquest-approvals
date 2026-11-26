import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { approvalItemCommentMaxLength } from '../../models/approval-item-comment.model';

export interface RejectReasonDialogItem {
  id: string;
  label: string;
}

export interface RejectReasonDialogData {
  items: RejectReasonDialogItem[];
  initialReasons?: Record<string, string>;
}

export type RejectReasonDialogResult = Record<string, string>;

@Component({
  selector: 'app-approval-reject-reason-dialog',
  templateUrl: './approval-reject-reason-dialog.component.html',
  styleUrls: ['./approval-reject-reason-dialog.component.scss'],
  imports: [TranslateModule, IgntDialogModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalRejectReasonDialogComponent {
  readonly data = inject<RejectReasonDialogData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<RejectReasonDialogResult>;

  protected readonly maxLength = approvalItemCommentMaxLength;
  readonly reasons = signal<ReadonlyMap<string, string>>(new Map<string, string>(Object.entries(this.data.initialReasons ?? {})));

  reasonFor(itemId: string): string {
    return this.reasons().get(itemId) ?? '';
  }

  setReason(itemId: string, value: string): void {
    const next = new Map(this.reasons());
    next.set(itemId, value);
    this.reasons.set(next);
  }

  allReasonsValid(): boolean {
    return this.data.items.every(item => {
      const reason = this.reasonFor(item.id).trim();
      return reason.length > 0 && reason.length <= approvalItemCommentMaxLength;
    });
  }

  confirm(): void {
    if (!this.allReasonsValid()) {
      return;
    }
    const result: RejectReasonDialogResult = {};
    for (const item of this.data.items) {
      result[item.id] = this.reasonFor(item.id).trim();
    }
    this.#dialogRef.close(result);
  }

  cancel(): void {
    this.#dialogRef.close();
  }
}
