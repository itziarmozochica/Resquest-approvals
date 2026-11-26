import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { newGridColumnId, normalizeGridColumns, TABLE_COLUMN_INPUT_TYPES, tableColumnUsesPicklistOptions } from '../../domain/grid-columns';
import { CatalogGridColumnSpec } from '../../models/service-catalog.model';

export interface GridColumnsChange {
  gridColumns: CatalogGridColumnSpec[];
  tableColumnPicklists: Record<string, string[]>;
}

@Component({
  selector: 'app-grid-column-editor',
  templateUrl: './grid-column-editor.component.html',
  styleUrls: ['./grid-column-editor.component.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridColumnEditorComponent implements OnChanges {
  @Input() columns: CatalogGridColumnSpec[] | null = null;
  @Input() picklists: Record<string, string[]> | null = null;
  @Input() disabled = false;

  @Output() columnsChange = new EventEmitter<GridColumnsChange>();

  readonly cols = signal<CatalogGridColumnSpec[]>([]);
  readonly picks = signal<Record<string, string[]>>({});
  readonly typeOptions = TABLE_COLUMN_INPUT_TYPES;

  #lastEmitted: string | null = null;

  get canRemove(): boolean {
    return this.cols().length > 1;
  }

  ngOnChanges(): void {
    const incoming = JSON.stringify({
      gridColumns: normalizeGridColumns(this.columns),
      tableColumnPicklists: this.#filtered(this.picklists ?? {}),
    });
    if (incoming === this.#lastEmitted) return;
    this.#lastEmitted = null;
    this.cols.set(normalizeGridColumns(this.columns));
    this.picks.set({ ...(this.picklists ?? {}) });
  }

  usesPicklist(col: CatalogGridColumnSpec): boolean {
    return tableColumnUsesPicklistOptions(col.type);
  }

  picklistText(index: number): string {
    const id = this.cols()[index]?.id ?? '';
    return (this.picks()[id] ?? []).join('\n');
  }

  setLabel(index: number, value: string): void {
    this.#mutate(index, c => ({ ...c, label: value }));
  }

  setHelpText(index: number, value: string): void {
    const trimmed = value.trim();
    this.#mutate(index, c => {
      const next = { ...c };
      if (trimmed) next.helpText = trimmed.slice(0, 500);
      else delete next.helpText;
      return next;
    });
  }

  setType(index: number, value: string): void {
    const id = this.cols()[index]?.id ?? '';
    if (!tableColumnUsesPicklistOptions(value)) {
      this.picks.update(p => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
    this.#mutate(index, c => ({ ...c, type: value }));
  }

  toggleDefaultRequired(index: number, on: boolean): void {
    this.#mutate(index, c => ({ ...c, defaultRequired: on ? true : undefined }));
  }

  toggleRequiredLocked(index: number, on: boolean): void {
    this.#mutate(index, c => ({ ...c, requiredLocked: on ? true : undefined, defaultRequired: on ? true : c.defaultRequired }));
  }

  setPlacement(index: number, value: string): void {
    this.cols.update(list => {
      const next = [...list];
      const col = { ...next[index] };
      if (value === 'table_header') col.placement = 'table_header';
      else delete col.placement;
      next[index] = col;
      return this.#enforceRowColumn(next);
    });
    this.#emit();
  }

  setPicklistText(index: number, raw: string): void {
    const id = this.cols()[index]?.id ?? '';
    if (!id) return;
    this.picks.update(p => ({ ...p, [id]: raw.split('\n') }));
    this.#emit();
  }

  addColumn(): void {
    this.cols.update(list => [...list, { id: newGridColumnId(), label: 'Column', type: 'text', defaultRequired: true }]);
    this.#emit();
  }

  removeColumn(index: number): void {
    if (!this.canRemove) return;
    const removed = this.cols()[index];
    if (removed) {
      this.picks.update(p => {
        const next = { ...p };
        delete next[removed.id];
        return next;
      });
    }
    this.cols.update(list => this.#enforceRowColumn(list.filter((_, i) => i !== index)));
    this.#emit();
  }

  moveUp(index: number): void {
    this.#swap(index, index - 1);
  }

  moveDown(index: number): void {
    this.#swap(index, index + 1);
  }

  #swap(from: number, to: number): void {
    const list = this.cols();
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    this.cols.set(next);
    this.#emit();
  }

  #mutate(index: number, fn: (col: CatalogGridColumnSpec) => CatalogGridColumnSpec): void {
    this.cols.update(list => {
      const next = [...list];
      next[index] = fn(next[index]);
      return next;
    });
    this.#emit();
  }

  #enforceRowColumn(list: CatalogGridColumnSpec[]): CatalogGridColumnSpec[] {
    if (list.length && !list.some(c => c.placement !== 'table_header')) {
      const next = [...list];
      next[0] = { ...next[0], placement: undefined };
      return next;
    }
    return list;
  }

  #filtered(src: Record<string, string[]>): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [id, lines] of Object.entries(src)) {
      const opts = (lines ?? []).map(l => l.trim()).filter(l => l.length > 0);
      if (opts.length) out[id] = opts;
    }
    return out;
  }

  #emit(): void {
    const gridColumns = this.cols();
    const tableColumnPicklists = this.#filtered(this.picks());
    this.#lastEmitted = JSON.stringify({ gridColumns: normalizeGridColumns(gridColumns), tableColumnPicklists });
    this.columnsChange.emit({ gridColumns, tableColumnPicklists });
  }
}
