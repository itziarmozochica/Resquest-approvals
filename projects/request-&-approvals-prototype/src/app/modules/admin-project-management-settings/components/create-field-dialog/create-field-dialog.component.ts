import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { InformationRequestQuestionType } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-question.model';
import { StepperTemplateSummary } from '@fz-original/app/modules/ir-approval/information-requests/models/stepper-template.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { normalizeGridColumns } from '../../domain/grid-columns';
import { CatalogFieldKind, CatalogGridColumnSpec } from '../../models/service-catalog.model';
import { GridColumnEditorComponent, GridColumnsChange } from '../grid-column-editor/grid-column-editor.component';

export interface CreateCustomFieldDraft {
  label: string;
  type: InformationRequestQuestionType;
  section: string;
  required: boolean;
  helpText: string | null;
  options: string[];
  kind: CatalogFieldKind;
  gridColumns?: CatalogGridColumnSpec[];
  tableColumnPicklists?: Record<string, string[]>;
  gridMinRows?: number | null;
  faqMinPairs?: number | null;
  stepperTemplateKey?: string;
  multiInstance?: boolean;
}

const SIMPLE_TYPES: InformationRequestQuestionType[] = [
  InformationRequestQuestionType.TEXT,
  InformationRequestQuestionType.TEXTAREA,
  InformationRequestQuestionType.NUMBER,
  InformationRequestQuestionType.PERCENTAGE,
  InformationRequestQuestionType.EMAIL,
  InformationRequestQuestionType.NAME,
  InformationRequestQuestionType.PHONE,
  InformationRequestQuestionType.WEBSITE,
  InformationRequestQuestionType.DATE,
  InformationRequestQuestionType.TIME,
  InformationRequestQuestionType.DATETIME,
  InformationRequestQuestionType.PICKLIST,
  InformationRequestQuestionType.DROPDOWN,
  InformationRequestQuestionType.MULTIPICKLIST,
];

const KIND_OPTIONS: CatalogFieldKind[] = ['simple', 'faq', 'grid', 'venue', 'stepperRef'];

@Component({
  selector: 'app-create-field-dialog',
  templateUrl: './create-field-dialog.component.html',
  styleUrls: ['./create-field-dialog.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, IgntButtonComponent, GridColumnEditorComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFieldDialogComponent implements OnInit {
  @Input() defaultSection = 'General';
  @Input() availableStepperTemplates: StepperTemplateSummary[] = [];
  @Input() excludeStepperKey: string | null = null;
  @Output() confirm = new EventEmitter<CreateCustomFieldDraft>();
  @Output() cancelled = new EventEmitter<void>();

  readonly types = SIMPLE_TYPES;
  readonly kindOptions = KIND_OPTIONS;
  readonly QuestionType = InformationRequestQuestionType;

  readonly step = signal<'kind' | 'config'>('kind');
  readonly kind = signal<CatalogFieldKind>('simple');

  gridColumns: CatalogGridColumnSpec[] | null = null;
  gridPicklists: Record<string, string[]> = {};
  gridMinRows: number | null = null;
  faqMinPairs: number | null = null;
  selectedStepperKey: string | null = null;
  multiInstanceForRef = false;

  readonly #fb = inject(FormBuilder);

  readonly form = this.#fb.group({
    label: ['', [Validators.required, Validators.minLength(1)]],
    type: [InformationRequestQuestionType.TEXT, [Validators.required]],
    section: ['General', [Validators.required]],
    required: [false],
    helpText: [''],
    options: [''],
  });

  ngOnInit(): void {
    if (this.defaultSection) {
      this.form.controls.section.setValue(this.defaultSection);
    }
  }

  supportsOptions(): boolean {
    const t = this.form.controls.type.value;
    return (
      t === InformationRequestQuestionType.PICKLIST ||
      t === InformationRequestQuestionType.DROPDOWN ||
      t === InformationRequestQuestionType.MULTIPICKLIST
    );
  }

  selectKind(kind: CatalogFieldKind): void {
    this.kind.set(kind);
    if (kind === 'grid' && !this.gridColumns) {
      this.gridColumns = normalizeGridColumns(null);
      this.gridPicklists = {};
    }
    if (kind === 'stepperRef' && this.selectedStepperKey === null) {
      const first = this.selectableStepperTemplates()[0];
      if (first) {
        this.selectedStepperKey = first.key;
        this.multiInstanceForRef = !!first.multiInstance;
      }
    }
  }

  selectableStepperTemplates(): StepperTemplateSummary[] {
    return this.availableStepperTemplates.filter(t => t.key !== this.excludeStepperKey);
  }

  onStepperKeyChange(key: string | null): void {
    this.selectedStepperKey = key;
    // Re-seed the multi-instance flag from the newly picked template so the saved draft can't carry a stale value.
    const template = this.selectableStepperTemplates().find(t => t.key === key);
    this.multiInstanceForRef = !!template?.multiInstance;
  }

  next(): void {
    this.step.set('config');
  }

  back(): void {
    this.step.set('kind');
  }

  onGridChange(change: GridColumnsChange): void {
    this.gridColumns = change.gridColumns;
    this.gridPicklists = change.tableColumnPicklists;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const kind = this.kind();
    if (kind === 'stepperRef' && !this.selectedStepperKey) {
      return;
    }
    const v = this.form.getRawValue();
    const options = (v.options ?? '')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const draft: CreateCustomFieldDraft = {
      label: (v.label ?? '').trim(),
      type: this.#typeForKind(kind, v.type ?? InformationRequestQuestionType.TEXT),
      section: (v.section ?? 'General').trim() || 'General',
      required: !!v.required,
      helpText: v.helpText ? v.helpText.trim() : null,
      options: kind === 'simple' ? options : [],
      kind,
    };
    if (kind === 'grid') {
      draft.gridColumns = this.gridColumns ?? [];
      draft.tableColumnPicklists = this.gridPicklists ?? {};
      draft.gridMinRows = this.gridMinRows;
    }
    if (kind === 'faq') {
      draft.faqMinPairs = this.faqMinPairs;
    }
    if (kind === 'stepperRef' && this.selectedStepperKey) {
      draft.stepperTemplateKey = this.selectedStepperKey;
      draft.multiInstance = this.multiInstanceForRef;
    }
    this.confirm.emit(draft);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  #typeForKind(kind: CatalogFieldKind, simpleType: InformationRequestQuestionType): InformationRequestQuestionType {
    switch (kind) {
      case 'faq':
        return InformationRequestQuestionType.FAQ;
      case 'grid':
        return InformationRequestQuestionType.CATALOG_GRID;
      case 'venue':
        return InformationRequestQuestionType.VENUE;
      case 'stepperRef':
        return InformationRequestQuestionType.STEPPER_REF;
      default:
        return simpleType;
    }
  }
}
