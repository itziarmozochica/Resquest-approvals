import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { TABLE_COLUMN_INPUT_TYPES, tableColumnUsesPicklistOptions } from '../../domain/grid-columns';
import { newTicketHeaderFieldId, normalizeTicketHeaderFields } from '../../domain/ticket-header-fields';
import { TicketTableHeaderFieldSpec } from '../../models/service-catalog.model';

@Component({
  selector: 'app-ticket-header-fields-editor',
  templateUrl: './ticket-header-fields-editor.component.html',
  styleUrls: ['./ticket-header-fields-editor.component.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketHeaderFieldsEditorComponent implements OnChanges {
  @Input() fields: TicketTableHeaderFieldSpec[] | null = null;
  @Input() disabled = false;

  @Output() fieldsChange = new EventEmitter<TicketTableHeaderFieldSpec[]>();

  readonly rows = signal<TicketTableHeaderFieldSpec[]>([]);
  readonly typeOptions = TABLE_COLUMN_INPUT_TYPES;

  #lastEmitted: string | null = null;

  ngOnChanges(): void {
    const incoming = JSON.stringify(normalizeTicketHeaderFields(this.fields));
    if (incoming === this.#lastEmitted) return;
    this.#lastEmitted = null;
    this.rows.set(normalizeTicketHeaderFields(this.fields));
  }

  usesPicklist(row: TicketTableHeaderFieldSpec): boolean {
    return tableColumnUsesPicklistOptions(row.type);
  }

  isRequired(row: TicketTableHeaderFieldSpec): boolean {
    return row.required !== false;
  }

  optionsText(index: number): string {
    return (this.rows()[index]?.options ?? []).join('\n');
  }

  helpersText(index: number): string {
    return (this.rows()[index]?.picklistOptionHelpers ?? []).join('\n');
  }

  setLabel(index: number, value: string): void {
    this.#mutate(index, r => ({ ...r, label: value }));
  }

  setType(index: number, value: string): void {
    this.#mutate(index, r => {
      const next = { ...r, type: value };
      if (!tableColumnUsesPicklistOptions(value)) {
        delete next.options;
        delete next.picklistOptionHelpers;
      }
      return next;
    });
  }

  setHelpText(index: number, value: string): void {
    const trimmed = value.trim();
    this.#mutate(index, r => {
      const next = { ...r };
      if (trimmed) next.helpText = trimmed.slice(0, 500);
      else delete next.helpText;
      return next;
    });
  }

  toggleRequired(index: number, on: boolean): void {
    this.#mutate(index, r => {
      const next = { ...r };
      if (on) delete next.required;
      else next.required = false;
      return next;
    });
  }

  setOptionsText(index: number, raw: string): void {
    const lines = raw.split('\n');
    this.#mutate(index, r => ({ ...r, options: lines }));
  }

  setHelpersText(index: number, raw: string): void {
    const lines = raw.split('\n');
    this.#mutate(index, r => ({ ...r, picklistOptionHelpers: lines }));
  }

  addField(): void {
    this.rows.update(list => [...list, { id: newTicketHeaderFieldId(), label: '', type: 'text' }]);
    this.#emit();
  }

  removeField(index: number): void {
    this.rows.update(list => list.filter((_, i) => i !== index));
    this.#emit();
  }

  moveUp(index: number): void {
    this.#swap(index, index - 1);
  }

  moveDown(index: number): void {
    this.#swap(index, index + 1);
  }

  #swap(from: number, to: number): void {
    const list = this.rows();
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    this.rows.set(next);
    this.#emit();
  }

  #mutate(index: number, fn: (row: TicketTableHeaderFieldSpec) => TicketTableHeaderFieldSpec): void {
    this.rows.update(list => {
      const next = [...list];
      next[index] = fn(next[index]);
      return next;
    });
    this.#emit();
  }

  #emit(): void {
    const normalized = normalizeTicketHeaderFields(this.rows());
    this.#lastEmitted = JSON.stringify(normalized);
    this.fieldsChange.emit(normalized);
  }
}
