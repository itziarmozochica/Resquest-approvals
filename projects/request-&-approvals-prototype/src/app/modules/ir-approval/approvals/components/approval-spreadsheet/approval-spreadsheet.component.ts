import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';

import { IgntButtonComponent, type TagSentiment } from '@ignite/common';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  approvalReviewDecisionControl,
  approvalReviewFeedbackControl,
  ApprovalReviewFormGroup,
} from '../../models/approval-review-form.util';
import { ApprovalStatus } from '../../models/approval-status.enum';
import { ApprovalRow } from '../../models/approval.model';
import { approvalStatusKey, approvalStatusSentiment } from '../../utils/approval-status.util';
import { ApprovalItemDecision, ApprovalItemReviewComponent } from '../approval-item-review/approval-item-review.component';

interface RowStatus {
  key: string;
  sentiment: TagSentiment;
}

@Component({
  selector: 'app-approval-spreadsheet',
  templateUrl: './approval-spreadsheet.component.html',
  styleUrls: ['./approval-spreadsheet.component.scss'],
  imports: [TranslateModule, IgntButtonComponent, IgntTagComponent, ApprovalItemReviewComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalSpreadsheetComponent {
  readonly rows = input<ApprovalRow[]>([]);
  readonly reviewForm = input.required<ApprovalReviewFormGroup>();
  readonly reviewable = input<boolean>(false);
  readonly informOnly = input<boolean>(false);
  readonly selectedIds = input<ReadonlySet<string>>(new Set<string>());
  readonly hiddenColumns = input<number[]>([]);
  readonly editableColumns = input<boolean>(false);
  readonly groupApprovedLast = input<boolean>(false);
  readonly reviewingIds = input<ReadonlySet<string>>(new Set<string>());
  /** True while any decision is in flight: every row refuses clicks, not just the ones being sent. */
  readonly reviewsLocked = input<boolean>(false);
  readonly decisionRequested = output<{ itemIds: string[]; decision: ApprovalItemDecision }>();
  readonly selectChange = output<{ id: string; selected: boolean }>();
  readonly columnToggle = output<number>();
  readonly columns = computed<string[]>(() => {
    const keys = new Set<string>();
    for (const row of this.rows()) {
      Object.keys(row.values ?? {}).forEach(k => keys.add(k));
    }
    return Array.from(keys);
  });
  readonly visibleColumns = computed<string[]>(() => this.columns().filter((_, index) => !this.hiddenColumns().includes(index)));
  readonly displayColumns = computed<string[]>(() => (this.editableColumns() ? this.columns() : this.visibleColumns()));

  isColumnHidden(index: number): boolean {
    return this.hiddenColumns().includes(index);
  }
  // Fully-empty rows (every column blank) are imported by the sheet but carry no content to review,
  // so they're hidden from the grid.
  readonly visibleRows = computed<ApprovalRow[]>(() => this.rows().filter(row => !this.#isEmptyRow(row)));
  readonly pendingRows = computed<ApprovalRow[]>(() =>
    this.visibleRows().filter(row => row.status !== ApprovalStatus.APPROVED && row.status !== ApprovalStatus.REJECTED),
  );
  protected readonly rowStatuses = computed<ReadonlyMap<string, RowStatus>>(
    () => new Map(this.rows().map(row => [row.id, { key: approvalStatusKey(row.status), sentiment: approvalStatusSentiment(row.status) }])),
  );
  readonly displayRows = computed<ApprovalRow[]>(() => {
    if (!this.groupApprovedLast()) {
      return this.visibleRows();
    }
    return this.visibleRows()
      .map((row, index) => ({ row, index }))
      .sort((a, b) => Number(this.isApproved(a.row)) - Number(this.isApproved(b.row)) || a.index - b.index)
      .map(entry => entry.row);
  });

  #isEmptyRow(row: ApprovalRow): boolean {
    return Object.values(row.values ?? {}).every(value => value === null || value === undefined || String(value).trim() === '');
  }

  reviewRow(row: ApprovalRow, decision: ApprovalItemDecision): void {
    this.decisionRequested.emit({ itemIds: [row.id], decision });
  }

  reviewAll(decision: 'APPROVE' | 'REJECT'): void {
    const itemIds = this.pendingRows().map(row => row.id);
    if (itemIds.length === 0) {
      return;
    }
    this.decisionRequested.emit({ itemIds, decision });
  }

  decisionControl(row: ApprovalRow): FormControl<ApprovalItemDecision | null> {
    return approvalReviewDecisionControl(this.reviewForm(), row.id);
  }

  disabled(): boolean {
    return this.reviewForm().disabled;
  }

  isSelected(row: ApprovalRow): boolean {
    return this.selectedIds().has(row.id);
  }

  commentValue(row: ApprovalRow): string {
    return approvalReviewFeedbackControl(this.reviewForm(), row.id).value || row.comment || '';
  }

  onSelect(row: ApprovalRow, target: EventTarget | null): void {
    this.selectChange.emit({ id: row.id, selected: (target as HTMLInputElement).checked });
  }

  isApproved(row: ApprovalRow): boolean {
    return row.status === ApprovalStatus.APPROVED;
  }

  cellValue(row: ApprovalRow, column: string): string {
    const value = row.values?.[column];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }
}
