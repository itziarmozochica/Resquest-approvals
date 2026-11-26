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
import { TableColumnType, TableRow } from '../ir-table-repeater-answer/ir-table-repeater-answer.component';

export interface CatalogGridColumn {
  id: string;
  label: string;
  type: TableColumnType;
  defaultRequired?: boolean;
  helpText?: string;
  options?: string[];
}

@Component({
  selector: 'app-ir-catalog-grid-answer',
  templateUrl: './ir-catalog-grid-answer.component.html',
  styleUrls: ['./ir-catalog-grid-answer.component.scss'],
  imports: [CommonModule, TranslateModule, IrCatalogKeyPipe, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrCatalogGridAnswerComponent implements OnChanges {
  @Input({ required: true }) testId!: string;
  @Input() columns: CatalogGridColumn[] = [];
  @Input() form: IrTableRowsFormArray | null = null;
  @Input() value: TableRow[] | null = null;
  @Input() readOnly = false;
  @Input() minRows = 0;

  @Output() valueChange = new EventEmitter<TableRow[]>();

  rows: TableRow[] = [];
  selectedIndex = 0;

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
        if (this.selectedIndex >= this.rows.length) {
          this.selectedIndex = Math.max(0, this.rows.length - 1);
        }
        this.#cdr.markForCheck();
      });
      return;
    }
    if (changes['value']) {
      this.rows = Array.isArray(this.value) ? this.value.map(r => ({ ...r })) : [];
      while (this.rows.length < this.minRows) {
        this.rows.push(this.#emptyRow());
      }
      if (this.selectedIndex >= this.rows.length) {
        this.selectedIndex = Math.max(0, this.rows.length - 1);
      }
    }
  }

  trackRow(index: number): number {
    return index;
  }

  trackColumn(_: number, column: CatalogGridColumn): string {
    return column.id;
  }

  selectRow(index: number): void {
    this.selectedIndex = index;
  }

  addRow(): void {
    if (this.form) {
      this.form.push(buildTableRowControl(this.#emptyRow(), this.#columnIds()));
      this.form.markAsDirty();
      this.#syncRowsFromForm();
      this.selectedIndex = this.rows.length - 1;
      this.valueChange.emit(this.rows);
      return;
    }
    this.rows = [...this.rows, this.#emptyRow()];
    this.selectedIndex = this.rows.length - 1;
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
      if (this.selectedIndex >= this.rows.length) {
        this.selectedIndex = Math.max(0, this.rows.length - 1);
      }
      this.valueChange.emit(this.rows);
      return;
    }
    this.rows = this.rows.filter((_, i) => i !== index);
    if (this.selectedIndex >= this.rows.length) {
      this.selectedIndex = Math.max(0, this.rows.length - 1);
    }
    this.valueChange.emit(this.rows);
  }

  cellValue(columnId: string): string {
    const row = this.rows[this.selectedIndex];
    if (!row) {
      return '';
    }
    const v = row[columnId];
    return v === undefined || v === null ? '' : String(v);
  }

  previewCell(rowIndex: number, columnId: string): string {
    const row = this.rows[rowIndex];
    if (!row) {
      return '';
    }
    const v = row[columnId];
    return v === undefined || v === null || v === '' ? '—' : String(v);
  }

  onFieldChange(column: CatalogGridColumn, raw: string): void {
    if (this.form) {
      const row = this.form.at(this.selectedIndex);
      row?.controls[column.id]?.setValue(this.#coerce(column.type, raw));
      row?.controls[column.id]?.markAsDirty();
      row?.markAsDirty();
      this.form.markAsDirty();
      this.#syncRowsFromForm();
      this.valueChange.emit(this.rows);
      return;
    }
    const next = [...this.rows];
    const row = { ...(next[this.selectedIndex] ?? {}) };
    row[column.id] = this.#coerce(column.type, raw);
    next[this.selectedIndex] = row;
    this.rows = next;
    this.valueChange.emit(this.rows);
  }

  rowSummary(index: number): string {
    const row = this.rows[index];
    if (!row) {
      return '';
    }
    const first = this.columns[0];
    if (!first) {
      return `#${index + 1}`;
    }
    const value = row[first.id];
    return value === undefined || value === null || value === '' ? `#${index + 1}` : String(value);
  }

  #emptyRow(): TableRow {
    const row: TableRow = {};
    for (const c of this.columns) {
      row[c.id] = '';
    }
    return row;
  }

  #syncRowsFromForm(): void {
    this.rows = this.form?.controls.map(row => row.getRawValue()) ?? [];
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
