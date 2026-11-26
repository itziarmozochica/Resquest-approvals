import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { buildTableRowControl, type IrTableRowsFormArray } from '../../models/ir-answers-form.util';
import { IrCatalogKeyPipe } from '../../pipes/ir-catalog-key.pipe';

export type TableColumnType = 'text' | 'textarea' | 'number' | 'percentage' | 'date' | 'time' | 'picklist';

export interface TableRepeaterColumn {
  id: string;
  label: string;
  type: TableColumnType;
  options?: string[];
}

export type TableRow = Record<string, unknown>;

@Component({
  selector: 'app-ir-table-repeater-answer',
  templateUrl: './ir-table-repeater-answer.component.html',
  styleUrls: ['./ir-table-repeater-answer.component.scss'],
  imports: [CommonModule, TranslateModule, IrCatalogKeyPipe, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrTableRepeaterAnswerComponent implements OnChanges {
  @Input({ required: true }) testId!: string;
  @Input() columns: TableRepeaterColumn[] = [];
  @Input() form: IrTableRowsFormArray | null = null;
  @Input() value: TableRow[] | null = null;
  @Input() readOnly = false;
  @Input() minRows = 0;
  @Input() addRowLabelKey = 'informationRequests.question.tableRepeater.addRow';

  @Output() valueChange = new EventEmitter<TableRow[]>();

  rows: TableRow[] = [];

  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  #formValueChangesSubscription?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) {
      this.#formValueChangesSubscription?.unsubscribe();
      this.#syncRowsFromForm();
      // Re-sync on external in-place mutations of the same FormArray (sibling updates, assistant writes).
      this.#formValueChangesSubscription = this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#syncRowsFromForm();
        this.#cdr.markForCheck();
      });
      return;
    }
    if (changes['value']) {
      this.rows = Array.isArray(this.value) ? this.value.map(r => ({ ...r })) : [];
      if (this.rows.length < this.minRows) {
        for (let i = this.rows.length; i < this.minRows; i++) {
          this.rows.push(this.#emptyRow());
        }
      }
    }
  }

  trackRow(index: number): number {
    return index;
  }

  trackColumn(_: number, column: TableRepeaterColumn): string {
    return column.id;
  }

  cellValue(row: TableRow, columnId: string): string {
    const v = row[columnId];
    return v === undefined || v === null ? '' : String(v);
  }

  onCellChange(rowIndex: number, column: TableRepeaterColumn, raw: string): void {
    if (this.form) {
      const row = this.form.at(rowIndex);
      row?.controls[column.id]?.setValue(this.#coerce(column.type, raw));
      row?.controls[column.id]?.markAsDirty();
      row?.markAsDirty();
      this.form.markAsDirty();
      this.#syncRowsFromForm();
      this.valueChange.emit(this.rows);
      return;
    }
    const next = [...this.rows];
    const row = { ...(next[rowIndex] ?? {}) };
    row[column.id] = this.#coerce(column.type, raw);
    next[rowIndex] = row;
    this.rows = next;
    this.valueChange.emit(this.rows);
  }

  addRow(): void {
    if (this.form) {
      this.form.push(buildTableRowControl(this.#emptyRow(), this.#columnIds()));
      this.form.markAsDirty();
      this.#syncRowsFromForm();
      this.valueChange.emit(this.rows);
      return;
    }
    this.rows = [...this.rows, this.#emptyRow()];
    this.valueChange.emit(this.rows);
  }

  removeRow(index: number): void {
    if (this.rows.length <= this.minRows) {
      return;
    }
    if (this.form) {
      this.form.removeAt(index);
      this.form.markAsDirty();
      this.#syncRowsFromForm();
      this.valueChange.emit(this.rows);
      return;
    }
    this.rows = this.rows.filter((_, i) => i !== index);
    this.valueChange.emit(this.rows);
  }

  #syncRowsFromForm(): void {
    this.rows = this.form?.controls.map(row => row.getRawValue()) ?? [];
  }

  #emptyRow(): TableRow {
    const row: TableRow = {};
    for (const c of this.columns) {
      row[c.id] = '';
    }
    return row;
  }

  #columnIds(): string[] {
    return this.columns.map(column => column.id);
  }

  #coerce(type: TableColumnType, raw: string): unknown {
    if (raw === '') {
      return '';
    }
    if (type === 'number' || type === 'percentage') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    return raw;
  }
}
