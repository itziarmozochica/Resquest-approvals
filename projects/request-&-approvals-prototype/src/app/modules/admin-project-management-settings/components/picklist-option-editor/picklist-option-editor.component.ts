import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { PersistedPicklistRows, PicklistOptionRow, picklistRowsFromState, picklistRowsToPersisted } from '../../domain/picklist-rows';

@Component({
  selector: 'app-picklist-option-editor',
  templateUrl: './picklist-option-editor.component.html',
  styleUrls: ['./picklist-option-editor.component.scss'],
  imports: [CommonModule, FormsModule, TranslateModule, IgntButtonComponent, CdkDropList, CdkDrag, CdkDragHandle],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicklistOptionEditorComponent {
  @Input() options: string[] | null = [];
  @Input() helpers: string[] | null = null;
  @Input() askDetail: boolean[] | null = null;
  @Input() supportsAskDetail = false;
  @Input() disabled = false;

  @Output() optionsChange = new EventEmitter<PersistedPicklistRows>();

  readonly rows = signal<PicklistOptionRow[]>([]);

  #lastEmitted: string | null = null;

  get canRemove(): boolean {
    return this.rows().length > 1;
  }

  ngOnChanges(): void {
    const incoming = JSON.stringify(this.#inputsAsPersisted());
    if (incoming === this.#lastEmitted) return;
    this.#lastEmitted = null;
    this.rows.set(picklistRowsFromState(this.options, this.helpers, this.askDetail));
  }

  setLabel(index: number, value: string): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? { ...r, label: value } : r)));
    this.#emit();
  }

  setHelper(index: number, value: string): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? { ...r, helper: value } : r)));
    this.#emit();
  }

  toggleAskDetail(index: number, value: boolean): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? { ...r, askDetail: value } : r)));
    this.#emit();
  }

  addRow(): void {
    this.rows.update(rows => [...rows, { label: '', helper: '', askDetail: false }]);
  }

  removeRow(index: number): void {
    if (this.rows().length <= 1) return;
    this.rows.update(rows => rows.filter((_, i) => i !== index));
    this.#emit();
  }

  drop(event: CdkDragDrop<PicklistOptionRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.rows.update(rows => {
      const next = [...rows];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
    this.#emit();
  }

  trackRow = (index: number): number => index;

  #emit(): void {
    const persisted = picklistRowsToPersisted(this.rows(), this.supportsAskDetail);
    this.#lastEmitted = JSON.stringify(persisted);
    this.optionsChange.emit(persisted);
  }

  #inputsAsPersisted(): PersistedPicklistRows {
    return {
      options: Array.isArray(this.options) ? this.options : [],
      helpers: Array.isArray(this.helpers) ? this.helpers : null,
      askDetail: Array.isArray(this.askDetail) ? this.askDetail : null,
    };
  }
}
