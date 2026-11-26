import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  InformationRequestQuestionType,
  parseInformationRequestQuestionType,
  questionTypeToBackendToken,
} from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-question.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  CATALOG_SELECTABLE_TYPES,
  CatalogRow,
  rowEnabled,
  rowFieldId,
  rowLabel,
  rowOptions,
  rowRequired,
  rowTypeSupportsOptions,
} from '../../domain/catalog-editor';
import { PersistedPicklistRows } from '../../domain/picklist-rows';
import {
  CatalogGridColumnSpec,
  ServiceCatalogCustomField,
  TemplateQuestionOverride,
  TicketTableHeaderFieldSpec,
} from '../../models/service-catalog.model';
import { GridColumnEditorComponent, GridColumnsChange } from '../grid-column-editor/grid-column-editor.component';
import { PicklistOptionEditorComponent } from '../picklist-option-editor/picklist-option-editor.component';
import { TicketHeaderFieldsEditorComponent } from '../ticket-header-fields-editor/ticket-header-fields-editor.component';

@Component({
  selector: 'app-field-card',
  templateUrl: './field-card.component.html',
  styleUrls: ['./field-card.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IgntButtonComponent,
    PicklistOptionEditorComponent,
    GridColumnEditorComponent,
    TicketHeaderFieldsEditorComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldCardComponent {
  @Input({ required: true }) row!: CatalogRow;
  @Input() overrides: Record<string, TemplateQuestionOverride> = {};

  @Output() overridePatch = new EventEmitter<{ questionId: string; patch: Partial<TemplateQuestionOverride> }>();
  @Output() customFieldPatch = new EventEmitter<{ fieldId: string; patch: Partial<ServiceCatalogCustomField> }>();
  @Output() removeField = new EventEmitter<string>();

  readonly typeOptions = CATALOG_SELECTABLE_TYPES;

  get isCustom(): boolean {
    return this.row.kind === 'custom';
  }

  get fieldId(): string {
    return rowFieldId(this.row);
  }

  get label(): string {
    return rowLabel(this.row, this.overrides);
  }

  get enabled(): boolean {
    return rowEnabled(this.row, this.overrides);
  }

  get required(): boolean {
    return rowRequired(this.row, this.overrides);
  }

  get options(): string[] {
    return rowOptions(this.row, this.overrides);
  }

  get helpers(): string[] | null {
    if (this.row.kind === 'custom') return this.row.field.picklistOptionHelpers ?? null;
    return this.overrides[this.row.question.id]?.picklistOptionHelpers ?? null;
  }

  get askDetail(): boolean[] | null {
    if (this.row.kind === 'custom') return this.row.field.picklistOptionAskDetail ?? null;
    return this.overrides[this.row.question.id]?.picklistOptionAskDetail ?? null;
  }

  get helpText(): string {
    if (this.row.kind === 'custom') return this.row.field.helpText ?? '';
    return this.overrides[this.row.question.id]?.helpText ?? this.row.question.helpText ?? '';
  }

  get type(): InformationRequestQuestionType {
    if (this.row.kind === 'custom') return this.row.field.type;
    const override = this.overrides[this.row.question.id]?.inputType;
    return override ? parseInformationRequestQuestionType(override) : this.row.question.type;
  }

  get supportsOptions(): boolean {
    return rowTypeSupportsOptions(this.type);
  }

  get showGridColumns(): boolean {
    return this.isCustom && this.type === InformationRequestQuestionType.CATALOG_GRID;
  }

  get gridColumns(): CatalogGridColumnSpec[] | null {
    return this.row.kind === 'custom' ? (this.row.field.gridColumns ?? null) : null;
  }

  get gridPicklists(): Record<string, string[]> | null {
    return this.row.kind === 'custom' ? (this.row.field.tableColumnPicklists ?? null) : null;
  }

  get showTicketHeader(): boolean {
    return this.type === InformationRequestQuestionType.TICKET_TYPES;
  }

  get ticketHeaderFields(): TicketTableHeaderFieldSpec[] | null {
    if (this.row.kind === 'custom') return this.row.field.ticketTableHeaderFields ?? null;
    return this.overrides[this.row.question.id]?.ticketTableHeaderFields ?? null;
  }

  get numericKey(): 'textareaMinRows' | 'faqMinPairs' | 'gridMinRows' | null {
    switch (this.type) {
      case InformationRequestQuestionType.TEXTAREA:
        return 'textareaMinRows';
      case InformationRequestQuestionType.FAQ:
        return 'faqMinPairs';
      case InformationRequestQuestionType.CATALOG_GRID:
        return this.isCustom ? 'gridMinRows' : null;
      default:
        return null;
    }
  }

  get numericMax(): number {
    return this.numericKey === 'textareaMinRows' ? 40 : 50;
  }

  get numericValue(): number | null {
    switch (this.numericKey) {
      case 'textareaMinRows':
        return this.row.kind === 'custom'
          ? (this.row.field.textareaMinRows ?? null)
          : (this.overrides[this.row.question.id]?.textareaMinRows ?? null);
      case 'faqMinPairs':
        return this.row.kind === 'custom'
          ? (this.row.field.faqMinPairs ?? null)
          : (this.overrides[this.row.question.id]?.faqMinPairs ?? null);
      case 'gridMinRows':
        return this.row.kind === 'custom' ? (this.row.field.gridMinRows ?? null) : null;
      default:
        return null;
    }
  }

  get requiredLocked(): boolean {
    if (this.row.kind !== 'builtin') return false;
    return this.overrides[this.row.question.id]?.requiredLocked ?? this.row.question.requiredLocked;
  }

  get removalLocked(): boolean {
    if (this.row.kind === 'builtin') {
      return this.overrides[this.row.question.id]?.removalLocked ?? this.row.question.removalLocked;
    }
    return this.row.field.removalLocked ?? false;
  }

  onLabelChange(value: string): void {
    const trimmed = value.trim();
    if (this.row.kind === 'builtin') {
      const baseline = this.row.question.label;
      this.overridePatch.emit({ questionId: this.row.question.id, patch: { label: trimmed && trimmed !== baseline ? trimmed : null } });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { label: trimmed } });
    }
  }

  onTypeChange(type: InformationRequestQuestionType): void {
    if (this.row.kind === 'builtin') {
      this.overridePatch.emit({
        questionId: this.row.question.id,
        patch: { inputType: type === this.row.question.type ? null : questionTypeToBackendToken(type) },
      });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { type } });
    }
  }

  onHelpTextChange(value: string): void {
    const trimmed = value.trim();
    if (this.row.kind === 'builtin') {
      const baseline = this.row.question.helpText ?? '';
      this.overridePatch.emit({ questionId: this.row.question.id, patch: { helpText: trimmed && trimmed !== baseline ? trimmed : null } });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { helpText: trimmed || null } });
    }
  }

  onEnabledChange(value: boolean): void {
    if (this.row.kind !== 'builtin') return;
    const baseline = this.row.question.enabled;
    this.overridePatch.emit({ questionId: this.row.question.id, patch: { enabled: value === baseline ? null : value } });
  }

  onRequiredChange(value: boolean): void {
    if (this.row.kind === 'builtin') {
      const baseline = this.row.question.required;
      this.overridePatch.emit({ questionId: this.row.question.id, patch: { required: value === baseline ? null : value } });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { required: value } });
    }
  }

  onRequiredLockedChange(value: boolean): void {
    if (this.row.kind !== 'builtin') return;
    const baseline = this.row.question.requiredLocked;
    this.overridePatch.emit({ questionId: this.row.question.id, patch: { requiredLocked: value === baseline ? null : value } });
  }

  onRemovalLockedChange(value: boolean): void {
    if (this.row.kind !== 'builtin') return;
    const baseline = this.row.question.removalLocked;
    this.overridePatch.emit({ questionId: this.row.question.id, patch: { removalLocked: value === baseline ? null : value } });
  }

  onPicklistChange(persisted: PersistedPicklistRows): void {
    const { options, helpers, askDetail } = persisted;
    if (this.row.kind === 'builtin') {
      const baseline = (this.row.question.options ?? []).join('\n');
      const next = options.join('\n');
      this.overridePatch.emit({
        questionId: this.row.question.id,
        patch: { options: next === baseline ? null : options, picklistOptionHelpers: helpers, picklistOptionAskDetail: askDetail },
      });
    } else {
      this.customFieldPatch.emit({
        fieldId: this.row.field.id,
        patch: { options: options.length ? options : null, picklistOptionHelpers: helpers, picklistOptionAskDetail: askDetail },
      });
    }
  }

  onNumericChange(value: number | null): void {
    const next = value != null && value >= 1 ? value : null;
    const key = this.numericKey;
    if (!key) return;
    if (this.row.kind === 'custom') {
      const patch: Partial<ServiceCatalogCustomField> =
        key === 'gridMinRows' ? { gridMinRows: next } : key === 'faqMinPairs' ? { faqMinPairs: next } : { textareaMinRows: next };
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch });
    } else if (key !== 'gridMinRows') {
      const patch: Partial<TemplateQuestionOverride> = key === 'faqMinPairs' ? { faqMinPairs: next } : { textareaMinRows: next };
      this.overridePatch.emit({ questionId: this.row.question.id, patch });
    }
  }

  onGridColumnsChange(change: GridColumnsChange): void {
    if (this.row.kind !== 'custom') return;
    this.customFieldPatch.emit({
      fieldId: this.row.field.id,
      patch: { gridColumns: change.gridColumns, tableColumnPicklists: change.tableColumnPicklists },
    });
  }

  onTicketHeaderChange(fields: TicketTableHeaderFieldSpec[]): void {
    const value = fields.length ? fields : null;
    if (this.row.kind === 'builtin') {
      this.overridePatch.emit({ questionId: this.row.question.id, patch: { ticketTableHeaderFields: value } });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { ticketTableHeaderFields: value } });
    }
  }

  onSectionChange(raw: string): void {
    const section = (raw || '').trim() || 'General';
    if (this.row.kind === 'builtin') {
      const baseline = (this.row.question.section ?? 'General') || 'General';
      this.overridePatch.emit({ questionId: this.row.question.id, patch: { section: section === baseline ? null : section } });
    } else {
      this.customFieldPatch.emit({ fieldId: this.row.field.id, patch: { section } });
    }
  }

  onRemove(): void {
    if (this.row.kind !== 'custom') return;
    this.removeField.emit(this.row.field.id);
  }
}
