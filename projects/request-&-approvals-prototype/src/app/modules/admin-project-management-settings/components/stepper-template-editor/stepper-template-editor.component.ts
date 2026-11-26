import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InformationRequestQuestionType } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-question.model';
import {
  StepperTemplate,
  StepperTemplateSummary,
} from '@fz-original/app/modules/ir-approval/information-requests/models/stepper-template.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { CatalogRow, newCustomFieldId } from '../../domain/catalog-editor';
import { ServiceCatalogCustomField, TemplateLayout } from '../../models/service-catalog.model';
import { CreateCustomFieldDraft, CreateFieldDialogComponent } from '../create-field-dialog/create-field-dialog.component';
import { FieldCardComponent } from '../field-card/field-card.component';
import { LayoutEditorComponent } from '../layout-editor/layout-editor.component';

interface SectionFieldGroup {
  section: string;
  fields: ServiceCatalogCustomField[];
}

const EMPTY_LAYOUT: TemplateLayout = { version: 1, sections: [] };

@Component({
  selector: 'app-stepper-template-editor',
  templateUrl: './stepper-template-editor.component.html',
  styleUrls: ['./stepper-template-editor.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IgntButtonComponent,
    LayoutEditorComponent,
    CreateFieldDialogComponent,
    FieldCardComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperTemplateEditorComponent {
  @Input() set template(value: StepperTemplate | null) {
    this.#applyTemplate(value);
  }
  @Input() availableStepperTemplates: StepperTemplateSummary[] = [];

  @Output() back = new EventEmitter<void>();
  @Output() save = new EventEmitter<StepperTemplate>();

  readonly #key = signal<string>('');
  readonly currentKey: Signal<string> = computed(() => this.#key());
  readonly label = signal<string>('');
  readonly multiInstance = signal<boolean>(false);
  readonly customFields = signal<ServiceCatalogCustomField[]>([]);
  readonly layout = signal<TemplateLayout>(EMPTY_LAYOUT);
  readonly createDialogOpen = signal<boolean>(false);

  readonly fieldLabels: Signal<Record<string, string>> = computed(() => {
    const out: Record<string, string> = {};
    for (const field of this.customFields()) {
      out[field.id] = field.label || field.id;
    }
    return out;
  });

  readonly groups: Signal<SectionFieldGroup[]> = computed(() => {
    const fields = this.customFields();
    const byId = new Map(fields.map(f => [f.id, f]));
    const used = new Set<string>();

    // Steps come from the layout: each section's rows/columns list the field ids it shows, in order.
    const groups: SectionFieldGroup[] = this.layout().sections.map(section => {
      const sectionFields: ServiceCatalogCustomField[] = [];
      for (const id of section.rows.flatMap(r => r.columns.flat())) {
        const field = byId.get(id);
        if (field && !used.has(id)) {
          sectionFields.push(field);
          used.add(id);
        }
      }
      return { section: section.title, fields: sectionFields };
    });

    // Fields not referenced by any layout section fall back to grouping by their own section name.
    const orphans = fields.filter(f => !used.has(f.id));
    for (const field of orphans) {
      const section = field.section || 'General';
      const existing = groups.find(g => g.section === section);
      if (existing) existing.fields.push(field);
      else groups.push({ section, fields: [field] });
    }

    if (!groups.length && fields.length) {
      groups.push({ section: 'General', fields });
    }
    return groups;
  });

  onLabelChange(next: string): void {
    this.label.set(next);
  }

  onMultiInstanceChange(next: boolean): void {
    this.multiInstance.set(next);
  }

  openCreateDialog(): void {
    this.createDialogOpen.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  defaultSectionForDialog(): string {
    const first = this.groups()[0]?.section;
    return first || 'Step 1';
  }

  confirmCreateField(draft: CreateCustomFieldDraft): void {
    const next: ServiceCatalogCustomField = {
      id: newCustomFieldId(),
      label: draft.label,
      type: draft.type,
      section: draft.section,
      order: this.#nextOrderInSection(draft.section),
      required: draft.required,
      helpText: draft.helpText,
      options: draft.options.length ? draft.options : null,
      kind: draft.kind,
      ...(draft.kind === 'grid'
        ? {
            gridColumns: draft.gridColumns ?? null,
            tableColumnPicklists: draft.tableColumnPicklists ?? null,
            gridMinRows: draft.gridMinRows ?? null,
          }
        : {}),
      ...(draft.kind === 'faq' ? { faqMinPairs: draft.faqMinPairs ?? null } : {}),
      ...(draft.kind === 'stepperRef'
        ? {
            stepperTemplateKey: draft.stepperTemplateKey ?? null,
            multiInstance: draft.multiInstance ?? false,
          }
        : {}),
    };
    this.customFields.update(list => [...list, next]);
    this.layout.update(prev => this.#ensureFieldInLayout(prev, next));
    this.createDialogOpen.set(false);
  }

  rowFor(field: ServiceCatalogCustomField): CatalogRow {
    return { kind: 'custom', templateKey: this.#key(), field, section: field.section ?? 'General', order: field.order };
  }

  onCustomFieldPatch(fieldId: string, patch: Partial<ServiceCatalogCustomField>): void {
    this.customFields.update(list => list.map(f => (f.id === fieldId ? { ...f, ...patch } : f)));
  }

  removeField(fieldId: string): void {
    this.customFields.update(list => list.filter(f => f.id !== fieldId));
    this.layout.update(prev => this.#stripFieldFromLayout(prev, fieldId));
  }

  onLayoutChange(next: TemplateLayout): void {
    this.layout.set(next);
  }

  emitSave(): void {
    const label = this.label().trim();
    if (!label) return;
    this.save.emit({
      key: this.#key(),
      label,
      multiInstance: this.multiInstance(),
      layout: this.layout(),
      customFields: this.customFields(),
    });
  }

  emitBack(): void {
    this.back.emit();
  }

  #applyTemplate(template: StepperTemplate | null): void {
    if (!template) {
      this.#key.set('');
      this.label.set('');
      this.multiInstance.set(false);
      this.customFields.set([]);
      this.layout.set(EMPTY_LAYOUT);
      return;
    }
    this.#key.set(template.key);
    this.label.set(template.label);
    this.multiInstance.set(template.multiInstance);
    this.customFields.set([...template.customFields]);
    this.layout.set(template.layout ?? EMPTY_LAYOUT);
  }

  #nextOrderInSection(section: string): number {
    const inSection = this.customFields().filter(f => (f.section ?? 'General') === section);
    if (!inSection.length) return 0;
    return Math.max(...inSection.map(f => f.order)) + 1;
  }

  #ensureFieldInLayout(layout: TemplateLayout, field: ServiceCatalogCustomField): TemplateLayout {
    const sectionTitle = field.section || 'General';
    const sections = [...layout.sections];
    const sectionIndex = sections.findIndex(s => s.title === sectionTitle);
    if (sectionIndex < 0) {
      sections.push({ title: sectionTitle, rows: [{ columns: [[field.id]] }] });
      return { ...layout, sections };
    }
    const section = sections[sectionIndex];
    const rows = section.rows.length ? [...section.rows] : [{ columns: [[]] as string[][] }];
    const lastRow = rows[rows.length - 1];
    const columns = lastRow.columns.length ? [...lastRow.columns] : [[] as string[]];
    columns[columns.length - 1] = [...columns[columns.length - 1], field.id];
    rows[rows.length - 1] = { columns };
    sections[sectionIndex] = { ...section, rows };
    return { ...layout, sections };
  }

  #stripFieldFromLayout(layout: TemplateLayout, fieldId: string): TemplateLayout {
    const sections = layout.sections.map(section => ({
      ...section,
      rows: section.rows.map(row => ({
        columns: row.columns.map(col => col.filter(id => id !== fieldId)),
      })),
    }));
    return { ...layout, sections };
  }

  protected readonly QuestionType = InformationRequestQuestionType;
}
