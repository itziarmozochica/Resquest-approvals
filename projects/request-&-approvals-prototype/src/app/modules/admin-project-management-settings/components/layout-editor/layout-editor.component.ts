import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  addColumnToRow,
  addRowToSection,
  moveFieldToColumn,
  removeColumnAt,
  removeFieldFromLayout,
  unusedFieldIds,
} from '../../domain/layout-editing';
import { TemplateLayout } from '../../models/service-catalog.model';

interface ColumnDropData {
  si: number;
  ri: number;
  ci: number;
}

interface TrayDropData {
  tray: true;
}

type LayoutDropData = ColumnDropData | TrayDropData;

const EMPTY_LAYOUT: TemplateLayout = { version: 1, sections: [] };

@Component({
  selector: 'app-layout-editor',
  templateUrl: './layout-editor.component.html',
  styleUrls: ['./layout-editor.component.scss'],
  imports: [CommonModule, TranslateModule, IgntButtonComponent, CdkDropListGroup, CdkDropList, CdkDrag],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutEditorComponent implements OnChanges {
  @Input() layout: TemplateLayout | null = null;
  @Input() fieldLabels: Record<string, string> = {};
  @Input() disabled = false;

  @Output() layoutChange = new EventEmitter<TemplateLayout>();

  readonly working = signal<TemplateLayout>(EMPTY_LAYOUT);

  #lastEmitted = '';

  ngOnChanges(): void {
    const incoming = this.layout ?? EMPTY_LAYOUT;
    if (JSON.stringify(incoming) === this.#lastEmitted) return;
    this.working.set(this.#clone(incoming));
  }

  unusedIds(): string[] {
    return unusedFieldIds(this.working(), Object.keys(this.fieldLabels));
  }

  labelFor(id: string): string {
    return this.fieldLabels[id] || id;
  }

  columnData(si: number, ri: number, ci: number): ColumnDropData {
    return { si, ri, ci };
  }

  get trayData(): TrayDropData {
    return { tray: true };
  }

  get eventScheduleCapture(): 'composer' | 'custom' | null {
    return this.working().eventScheduleCapture ?? null;
  }

  addColumn(si: number, ri: number): void {
    if (this.disabled) return;
    this.#commit(addColumnToRow(this.working(), si, ri));
  }

  removeColumn(si: number, ri: number, ci: number): void {
    if (this.disabled) return;
    this.#commit(removeColumnAt(this.working(), si, ri, ci));
  }

  addRow(si: number): void {
    if (this.disabled) return;
    this.#commit(addRowToSection(this.working(), si));
  }

  setEventScheduleCapture(mode: 'composer' | 'custom' | null): void {
    if (this.disabled) return;
    this.#commit({ ...this.working(), eventScheduleCapture: mode });
  }

  drop(event: CdkDragDrop<unknown>): void {
    if (this.disabled) return;
    const fieldId = event.item.data as string;
    const target = event.container.data as LayoutDropData;
    if ('tray' in target) {
      this.#commit(removeFieldFromLayout(this.working(), fieldId));
      return;
    }
    this.#commit(moveFieldToColumn(this.working(), fieldId, target.si, target.ri, target.ci, event.currentIndex));
  }

  #commit(next: TemplateLayout): void {
    this.working.set(next);
    this.#lastEmitted = JSON.stringify(next);
    this.layoutChange.emit(next);
  }

  #clone(layout: TemplateLayout): TemplateLayout {
    return {
      version: layout.version,
      ...(layout.eventScheduleCapture != null ? { eventScheduleCapture: layout.eventScheduleCapture } : {}),
      sections: layout.sections.map(s => ({
        title: s.title,
        rows: s.rows.map(r => ({ columns: r.columns.map(c => [...c]) })),
      })),
    };
  }
}
