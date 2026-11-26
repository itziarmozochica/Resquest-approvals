import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, Signal, signal } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { buildLayoutFromRows, buildRowsForTemplate, CatalogRow, rowFieldId, rowLabel, uniqueSections } from '../../domain/catalog-editor';
import { MergedTemplate, ServiceCatalogCustomField, TemplateLayout, TemplateQuestionOverride } from '../../models/service-catalog.model';
import { FieldCardComponent } from '../field-card/field-card.component';
import { LayoutEditorComponent } from '../layout-editor/layout-editor.component';

export interface ReorderEvent {
  templateKey: string;
  rows: CatalogRow[];
  fromIndex: number;
  toIndex: number;
}

@Component({
  selector: 'app-template-editor',
  templateUrl: './template-editor.component.html',
  styleUrls: ['./template-editor.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
    IgntButtonComponent,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    FieldCardComponent,
    LayoutEditorComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateEditorComponent {
  readonly #templateKey = signal<string>('');
  readonly #merged = signal<MergedTemplate | null>(null);
  readonly #customFields = signal<ServiceCatalogCustomField[]>([]);
  readonly #overrides = signal<Record<string, TemplateQuestionOverride>>({});

  @Input() set templateKey(value: string) {
    this.#templateKey.set(value);
  }
  get templateKey(): string {
    return this.#templateKey();
  }

  @Input() set merged(value: MergedTemplate | null) {
    this.#merged.set(value);
  }
  get merged(): MergedTemplate | null {
    return this.#merged();
  }

  @Input() set customFields(value: ServiceCatalogCustomField[]) {
    this.#customFields.set(value ?? []);
  }
  get customFields(): ServiceCatalogCustomField[] {
    return this.#customFields();
  }

  @Input() set overrides(value: Record<string, TemplateQuestionOverride>) {
    this.#overrides.set(value ?? {});
  }
  get overrides(): Record<string, TemplateQuestionOverride> {
    return this.#overrides();
  }

  readonly #layout = signal<TemplateLayout | null>(null);

  @Input() set layout(value: TemplateLayout | null) {
    this.#layout.set(value ?? null);
  }
  get layout(): TemplateLayout | null {
    return this.#layout();
  }

  @Output() layoutChange = new EventEmitter<TemplateLayout>();

  @Output() overridePatch = new EventEmitter<{ questionId: string; patch: Partial<TemplateQuestionOverride> }>();
  @Output() customFieldPatch = new EventEmitter<{ fieldId: string; patch: Partial<ServiceCatalogCustomField> }>();
  @Output() removeCustomField = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<ReorderEvent>();
  @Output() addField = new EventEmitter<void>();

  readonly rows: Signal<CatalogRow[]> = computed(() => {
    const merged = this.#merged();
    if (!merged) return [];
    return buildRowsForTemplate(this.#templateKey(), merged, this.#customFields(), this.#overrides());
  });

  readonly sections: Signal<string[]> = computed(() => uniqueSections(this.rows()));

  readonly showLayout = signal(false);

  readonly fieldLabels: Signal<Record<string, string>> = computed(() => {
    const out: Record<string, string> = {};
    const overrides = this.#overrides();
    for (const row of this.rows()) {
      out[rowFieldId(row)] = rowLabel(row, overrides);
    }
    return out;
  });

  readonly effectiveLayout: Signal<TemplateLayout> = computed(() => {
    const incoming = this.#layout();
    if (incoming && incoming.sections.length) return incoming;
    return buildLayoutFromRows(this.rows());
  });

  trackRow = (_: number, row: CatalogRow): string => rowFieldId(row);

  toggleLayout(): void {
    this.showLayout.update(v => !v);
  }

  onLayoutChange(layout: TemplateLayout): void {
    this.layoutChange.emit(layout);
  }

  drop(event: CdkDragDrop<CatalogRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.reorder.emit({
      templateKey: this.#templateKey(),
      rows: this.rows(),
      fromIndex: event.previousIndex,
      toIndex: event.currentIndex,
    });
  }

  onAddField(): void {
    this.addField.emit();
  }
}
