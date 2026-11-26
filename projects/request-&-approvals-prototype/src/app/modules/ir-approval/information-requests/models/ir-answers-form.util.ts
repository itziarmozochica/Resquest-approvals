import { FormArray, FormControl, FormGroup, Validators, type AbstractControl, type ValidatorFn } from '@angular/forms';

import type { ServiceCatalogCustomField } from '@fz-original/app/modules/admin-project-management-settings/models/service-catalog.model';

import { parseCatalogGridBundle, serializeCatalogGridBundle, type CatalogGridRow } from './catalog-grid-bundle.util';
import type { ProductRow } from './event-schedule-composer-v1.model';
import {
  fileAnswerKey,
  InformationRequestFileAnswer,
  InformationRequestQuestion,
  InformationRequestQuestionType,
} from './information-request-question.model';
import { parseProductCatalogProducts, serializeProductCatalogProducts } from './product-catalog.model';
import { isAnswerPresent, parseMaybeJson } from './question-answer.util';
import type { StepperInstanceAnswer, StepperTemplate } from './stepper-template.model';

export type IrAnswersForm = FormGroup<Record<string, AbstractControl>>;
export type IrTableRowForm = FormGroup<Record<string, FormControl<unknown>>>;
export type IrTableRowsFormArray = FormArray<IrTableRowForm>;
export type IrVenueFormGroup = FormGroup<Record<string, FormControl<unknown>>>;
export type IrEventScheduleFormGroup = FormGroup<{
  meta: FormControl<Record<string, unknown>>;
  rows: IrTableRowsFormArray;
}>;
export type IrProductSubcategoryFormGroup = FormGroup<Record<string, FormControl<unknown>>>;
export type IrProductFormGroup = FormGroup<Record<string, AbstractControl>>;
export type IrProductFormArray = FormArray<IrProductFormGroup>;
export type IrStepperInstanceFormGroup = FormGroup<{
  answers: IrAnswersForm;
  instanceId: FormControl<string>;
}>;
export type IrStepperFormArray = FormArray<IrStepperInstanceFormGroup>;

export interface BuildAnswersFormOptions {
  referencedStepperTemplates?: Readonly<Record<string, StepperTemplate>>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const PHONE_PATTERN = /^\+?[\d\s\-()]{6,}$/;

const FILE_TYPES = new Set<InformationRequestQuestionType>([InformationRequestQuestionType.FILE, InformationRequestQuestionType.MULTIFILE]);
const VENUE_FIELD_IDS = [
  'placeId',
  'name',
  'address',
  'city',
  'region',
  'country',
  'zipCode',
  'latitude',
  'longitude',
  'currency',
  'mustUseTaxBase',
  'productTaxRates',
] as const;
const PRODUCT_FIELD_IDS = ['id', 'name', 'capacity', 'pricing', 'productType'] as const;
const PRODUCT_SUBCATEGORY_FIELD_IDS = ['id', 'name', 'category', 'capacity', 'pricing'] as const;

function patternValidator(pattern: RegExp, errorKey: string): ValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return pattern.test(String(value)) ? null : { [errorKey]: true };
  };
}

function minFilesValidator(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    const count = Array.isArray(control.value) ? control.value.length : 0;
    return count >= min ? null : { minFiles: { actual: count, required: min } };
  };
}

function serializedPresenceValidator(question: InformationRequestQuestion): ValidatorFn {
  return (control: AbstractControl) =>
    isAnswerPresent(question.type, serializeQuestionControl(question, control)) ? null : { required: true };
}

export function defaultAnswerValue(type: InformationRequestQuestionType): unknown {
  if (
    type === InformationRequestQuestionType.MULTIPICKLIST ||
    type === InformationRequestQuestionType.MULTIFILE ||
    type === InformationRequestQuestionType.TICKET_TYPES ||
    type === InformationRequestQuestionType.CATALOG_GRID ||
    type === InformationRequestQuestionType.FAQ
  ) {
    return [];
  }
  if (type === InformationRequestQuestionType.VENUE) {
    return {};
  }
  return null;
}

export function buildQuestionValidators(question: InformationRequestQuestion): ValidatorFn[] {
  const validation = question.validation ?? {};
  const validators: ValidatorFn[] = [];

  if (question.required) {
    validators.push(Validators.required);
    if (isCompositeQuestion(question)) {
      validators.push(serializedPresenceValidator(question));
    }
  }

  switch (question.type) {
    case InformationRequestQuestionType.EMAIL:
      validators.push(patternValidator(EMAIL_PATTERN, 'emailPattern'));
      break;
    case InformationRequestQuestionType.WEBSITE:
      validators.push(patternValidator(URL_PATTERN, 'urlPattern'));
      break;
    case InformationRequestQuestionType.PHONE:
      validators.push(patternValidator(PHONE_PATTERN, 'phonePattern'));
      break;
    case InformationRequestQuestionType.NUMBER:
      if (validation.min != null) validators.push(Validators.min(validation.min));
      if (validation.max != null) validators.push(Validators.max(validation.max));
      break;
    case InformationRequestQuestionType.PERCENTAGE:
      validators.push(Validators.min(validation.min ?? 0));
      validators.push(Validators.max(validation.max ?? 100));
      break;
    case InformationRequestQuestionType.TEXT:
    case InformationRequestQuestionType.TEXTAREA:
    case InformationRequestQuestionType.NAME:
      if (validation.min != null) validators.push(Validators.minLength(validation.min));
      if (validation.max != null) validators.push(Validators.maxLength(validation.max));
      break;
    case InformationRequestQuestionType.MULTIFILE:
      if (validation.min != null) validators.push(minFilesValidator(validation.min));
      break;
    default:
      break;
  }

  if (validation.regex) {
    validators.push(Validators.pattern(validation.regex));
  }

  return validators;
}

export function buildAnswersForm(questions: readonly InformationRequestQuestion[], options: BuildAnswersFormOptions = {}): IrAnswersForm {
  const controls: Record<string, AbstractControl> = {};
  for (const question of questions) {
    controls[question.id] = buildQuestionControl(question, options);
  }
  return new FormGroup<Record<string, AbstractControl>>(controls);
}

export function buildQuestionControl(question: InformationRequestQuestion, options: BuildAnswersFormOptions = {}): AbstractControl {
  const answer = question.answer ?? defaultAnswerValue(question.type);
  let control: AbstractControl;

  switch (question.type) {
    case InformationRequestQuestionType.VENUE:
      control = buildVenueControl(answer);
      break;
    case InformationRequestQuestionType.FAQ:
      control = buildRowsControl(rowsFromAnswer(answer), tableColumnIds(question));
      break;
    case InformationRequestQuestionType.CATALOG_GRID:
      control = eventScheduleComposerEnabled(question)
        ? buildEventScheduleControl(answer, gridColumnIds(question))
        : buildRowsControl(catalogRowsFromAnswer(answer), gridColumnIds(question), catalogGridMinRows(question));
      break;
    case InformationRequestQuestionType.TICKET_TYPES:
      control = buildProductsControl(answer);
      break;
    case InformationRequestQuestionType.STEPPER_REF:
      control = buildStepperControl(question, answer, options.referencedStepperTemplates ?? {});
      break;
    default:
      control = new FormControl<unknown>(answer, { validators: buildQuestionValidators(question) });
      break;
  }

  if (isCompositeQuestion(question)) {
    control.setValidators(buildQuestionValidators(question));
    control.updateValueAndValidity({ emitEvent: false });
  }

  return control;
}

export function buildAnswersSnapshot(
  questions: readonly InformationRequestQuestion[],
  form: IrAnswersForm,
  options: BuildAnswersFormOptions = {},
): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const question of questions) {
    answers[question.id] = serializeQuestionAnswer(question, form, options);
  }
  return answers;
}

export function serializeQuestionAnswer(
  question: InformationRequestQuestion,
  form: IrAnswersForm,
  options: BuildAnswersFormOptions = {},
): unknown {
  return serializeQuestionControl(question, form.controls[question.id], options);
}

export function serializeQuestionControl(
  question: InformationRequestQuestion,
  control: AbstractControl | null | undefined,
  options: BuildAnswersFormOptions = {},
): unknown {
  if (!control) {
    return defaultAnswerValue(question.type);
  }
  switch (question.type) {
    case InformationRequestQuestionType.VENUE:
      return control instanceof FormGroup ? compactObject(control.getRawValue()) : control.value;
    case InformationRequestQuestionType.FAQ:
      return control instanceof FormArray ? rowsFromControl(control) : control.value;
    case InformationRequestQuestionType.CATALOG_GRID:
      if (eventScheduleComposerEnabled(question) && control instanceof FormGroup) {
        return serializeCatalogGridBundle(catalogGridRowsFromControl(control.controls['rows']), control.controls['meta'].value);
      }
      return control instanceof FormArray ? rowsFromControl(control) : control.value;
    case InformationRequestQuestionType.TICKET_TYPES:
      return control instanceof FormArray ? serializeProductCatalogProducts(productsFromControl(control)) : control.value;
    case InformationRequestQuestionType.STEPPER_REF:
      if (!(control instanceof FormArray)) {
        return control.value;
      }
      return question.multiInstance === false
        ? (stepperInstancesFromControl(question, control, options)[0] ?? null)
        : stepperInstancesFromControl(question, control, options);
    default:
      return control.value;
  }
}

export function isInformationRequestComplete(
  questions: readonly InformationRequestQuestion[],
  answersByQuestionId: Readonly<Record<string, unknown>>,
  pendingFileQuestionIds: ReadonlySet<string> = new Set<string>(),
): boolean {
  const ticketSourceIds = embeddedTicketSourceIds(questions);
  const eventSchedule = hasEventScheduleQuestion(questions);
  const isHidden = (question: InformationRequestQuestion): boolean =>
    question.type === InformationRequestQuestionType.TICKET_TYPES && (ticketSourceIds.has(question.id) || eventSchedule);

  return questions.every(question => {
    if (!question.required || isHidden(question)) {
      return true;
    }
    if (FILE_TYPES.has(question.type) && pendingFileQuestionIds.has(question.id)) {
      return true;
    }
    return isAnswerPresent(question.type, answersByQuestionId[question.id]);
  });
}

export function isCompositeQuestion(question: InformationRequestQuestion): boolean {
  return (
    question.type === InformationRequestQuestionType.VENUE ||
    question.type === InformationRequestQuestionType.FAQ ||
    question.type === InformationRequestQuestionType.CATALOG_GRID ||
    question.type === InformationRequestQuestionType.TICKET_TYPES ||
    question.type === InformationRequestQuestionType.STEPPER_REF
  );
}

export function eventScheduleComposerEnabled(question: InformationRequestQuestion): boolean {
  return (
    question.type === InformationRequestQuestionType.CATALOG_GRID && question.compositeMetadata?.['grid_composer'] === 'event_schedule'
  );
}

export function tableColumnIds(question: InformationRequestQuestion): string[] {
  const types = (question.compositeMetadata?.['table_column_types'] as Record<string, string> | undefined) ?? {};
  return Object.keys(types);
}

export function gridColumnIds(question: InformationRequestQuestion): string[] {
  const raw = (question.compositeMetadata?.['grid_columns'] as Array<Record<string, unknown>> | undefined) ?? [];
  return raw.map(column => String(column['id'] ?? '')).filter(Boolean);
}

export function catalogGridMinRows(question: InformationRequestQuestion): number {
  const value = question.compositeMetadata?.['grid_min_rows'];
  return typeof value === 'number' && value > 0 ? value : 0;
}

function buildVenueControl(answer: unknown): IrVenueFormGroup {
  const value = answer && typeof answer === 'object' && !Array.isArray(answer) ? (answer as Record<string, unknown>) : {};
  const controls: Record<string, FormControl<unknown>> = {};
  for (const field of VENUE_FIELD_IDS) {
    controls[field] = new FormControl<unknown>(value[field] ?? null);
  }
  return new FormGroup<Record<string, FormControl<unknown>>>(controls);
}

function buildRowsControl(rows: Record<string, unknown>[], columns: readonly string[], minRows = 0): IrTableRowsFormArray {
  const normalized = [...rows];
  while (normalized.length < minRows) {
    normalized.push(emptyRow(columns));
  }
  return new FormArray<IrTableRowForm>(normalized.map(row => buildTableRowControl(row, columns)));
}

export function buildTableRowControl(row: Record<string, unknown>, columns: readonly string[]): IrTableRowForm {
  const controls: Record<string, FormControl<unknown>> = {};
  const ids = columns.length ? columns : Object.keys(row);
  for (const id of ids) {
    controls[id] = new FormControl<unknown>(row[id] ?? '');
  }
  return new FormGroup<Record<string, FormControl<unknown>>>(controls);
}

function buildEventScheduleControl(answer: unknown, columns: readonly string[]): IrEventScheduleFormGroup {
  const bundle = parseCatalogGridBundle(answer);
  return new FormGroup({
    meta: new FormControl<Record<string, unknown>>(bundle?.meta ?? {}, { nonNullable: true }),
    rows: buildRowsControl(bundle?.rows ?? [], columns),
  });
}

function buildProductsControl(answer: unknown): IrProductFormArray {
  const products = typeof answer === 'string' ? parseProductCatalogProducts(answer) : Array.isArray(answer) ? (answer as ProductRow[]) : [];
  return new FormArray<IrProductFormGroup>(products.map(buildProductControl));
}

export function buildProductControl(product: ProductRow): IrProductFormGroup {
  const controls: Record<string, AbstractControl> = {};
  for (const field of PRODUCT_FIELD_IDS) {
    controls[field] = new FormControl<unknown>(product[field] ?? (field === 'id' ? newProductId() : ''));
  }
  controls['subcategories'] = new FormArray<IrProductSubcategoryFormGroup>(
    (product.subcategories ?? []).map(subcategory => {
      const subControls: Record<string, FormControl<unknown>> = {};
      for (const field of PRODUCT_SUBCATEGORY_FIELD_IDS) {
        subControls[field] = new FormControl<unknown>(subcategory[field] ?? '');
      }
      return new FormGroup<Record<string, FormControl<unknown>>>(subControls);
    }),
  );
  return new FormGroup<Record<string, AbstractControl>>(controls);
}

function buildStepperControl(
  question: InformationRequestQuestion,
  answer: unknown,
  templates: Readonly<Record<string, StepperTemplate>>,
): IrStepperFormArray | FormControl<unknown> {
  const template = question.stepperTemplateKey ? templates[question.stepperTemplateKey] : null;
  if (!template) {
    return new FormControl<unknown>(answer);
  }
  const instances = normalizeStepperValue(answer);
  return new FormArray<IrStepperInstanceFormGroup>(instances.map(instance => buildStepperInstanceControl(instance, template)));
}

export function buildStepperInstanceControl(instance: StepperInstanceAnswer, template: StepperTemplate): IrStepperInstanceFormGroup {
  return new FormGroup({
    answers: buildAnswersForm(
      template.customFields.map(field => customFieldToQuestion(field, instance.answers[field.id])),
      { referencedStepperTemplates: { [template.key]: template } },
    ),
    instanceId: new FormControl(instance.instanceId, { nonNullable: true }),
  });
}

export function customFieldToQuestion(field: ServiceCatalogCustomField, answer: unknown): InformationRequestQuestion {
  return {
    acceptedFileKinds: field.acceptedFileKinds ?? null,
    answer,
    compositeMetadata: buildMeta(field),
    helpText: field.helpText ?? null,
    id: field.id,
    label: field.label,
    multiInstance: field.multiInstance ?? null,
    options: field.options ?? null,
    removalLocked: field.removalLocked ?? false,
    required: field.required ?? false,
    requiredLocked: false,
    section: field.section,
    stepperTemplateKey: field.stepperTemplateKey ?? null,
    type: field.type,
    validation: null,
  };
}

function buildMeta(field: ServiceCatalogCustomField): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};
  if (field.gridColumns) meta['grid_columns'] = field.gridColumns;
  if (field.gridMinRows != null) meta['grid_min_rows'] = field.gridMinRows;
  if (field.fileAccept) meta['file_accept'] = field.fileAccept;
  if (field.tableColumnTypes) meta['table_column_types'] = field.tableColumnTypes;
  if (field.tableColumnPicklists) meta['table_column_picklists'] = field.tableColumnPicklists;
  if (field.faqMinPairs != null) meta['faq_min_pairs'] = field.faqMinPairs;
  if (field.textareaMinRows != null) meta['textarea_min_rows'] = field.textareaMinRows;
  if (field.gridComposer != null) meta['grid_composer'] = field.gridComposer;
  if (field.productSourceFieldId != null) meta['product_source_field_id'] = field.productSourceFieldId;
  if (field.productNameColumn != null) meta['product_name_column'] = field.productNameColumn;
  if (field.venueSourceFieldId != null) meta['venue_source_field_id'] = field.venueSourceFieldId;
  return Object.keys(meta).length > 0 ? meta : null;
}

function normalizeStepperValue(value: unknown): StepperInstanceAnswer[] {
  if (!value) return [];
  return Array.isArray(value) ? (value as StepperInstanceAnswer[]) : [value as StepperInstanceAnswer];
}

function rowsFromAnswer(answer: unknown): Record<string, unknown>[] {
  const parsed = parseMaybeJson(answer);
  return Array.isArray(parsed) ? parsed.filter(isRecord).map(row => ({ ...row })) : [];
}

function catalogRowsFromAnswer(answer: unknown): Record<string, unknown>[] {
  const bundle = parseCatalogGridBundle(answer);
  return bundle?.rows ?? rowsFromAnswer(answer);
}

export function rowsFromControl(control: AbstractControl): Record<string, unknown>[] {
  if (!(control instanceof FormArray)) {
    return [];
  }
  return control.controls.map(row => (row instanceof FormGroup ? row.getRawValue() : {}));
}

function catalogGridRowsFromControl(control: AbstractControl): CatalogGridRow[] {
  return rowsFromControl(control).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])));
}

export function productsFromControl(control: FormArray): ProductRow[] {
  return control.controls.map((group, index) => {
    const raw = group instanceof FormGroup ? group.getRawValue() : {};
    const subcategoriesControl = group instanceof FormGroup ? group.controls['subcategories'] : null;
    const subcategories =
      subcategoriesControl instanceof FormArray
        ? subcategoriesControl.controls.map(sub => (sub instanceof FormGroup ? sub.getRawValue() : {}))
        : [];
    return {
      capacity: String(raw['capacity'] ?? ''),
      id: String(raw['id'] ?? `p-${index}`),
      name: String(raw['name'] ?? ''),
      pricing: String(raw['pricing'] ?? ''),
      productType: String(raw['productType'] ?? ''),
      subcategories: subcategories.map((sub, subIndex) => ({
        capacity: String(sub['capacity'] ?? ''),
        category: String(sub['category'] ?? ''),
        id: String(sub['id'] ?? `p-${index}-${subIndex}`),
        name: String(sub['name'] ?? ''),
        pricing: String(sub['pricing'] ?? ''),
      })),
    };
  });
}

function stepperInstancesFromControl(
  question: InformationRequestQuestion,
  control: FormArray,
  options: BuildAnswersFormOptions,
): StepperInstanceAnswer[] {
  const template = question.stepperTemplateKey ? options.referencedStepperTemplates?.[question.stepperTemplateKey] : null;
  return control.controls.map((group, index) => {
    const answersForm = group instanceof FormGroup && group.controls.answers instanceof FormGroup ? group.controls.answers : null;
    const answers =
      answersForm && template
        ? buildAnswersSnapshot(
            template.customFields.map(field => customFieldToQuestion(field, undefined)),
            answersForm,
            options,
          )
        : (answersForm?.getRawValue() ?? {});
    const instanceId = group instanceof FormGroup ? group.controls.instanceId.value : `stp-${index}`;
    return { answers, instanceId };
  });
}

function embeddedTicketSourceIds(questions: readonly InformationRequestQuestion[]): Set<string> {
  const ids = new Set<string>();
  for (const question of questions) {
    if (!eventScheduleComposerEnabled(question)) {
      continue;
    }
    const sourceId = question.compositeMetadata?.['product_source_field_id'];
    if (typeof sourceId === 'string' && sourceId.trim()) {
      ids.add(sourceId.trim());
    }
  }
  return ids;
}

function hasEventScheduleQuestion(questions: readonly InformationRequestQuestion[]): boolean {
  return questions.some(question => eventScheduleComposerEnabled(question) || question.stepperTemplateKey === 'event-schedule-default');
}

function emptyRow(columns: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(columns.map(column => [column, '']));
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function newProductId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  return `p-${c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;
}

export interface MergedUploadedFileAnswers {
  added: InformationRequestFileAnswer[];
  changed: boolean;
  value: unknown;
}

/**
 * Merges freshly fetched server file answers into the current control value. Entries the control
 * already holds are refreshed in place (matched by `importJobId`) so their sync status, Drive id,
 * link and first thumbnail follow the server; entries missing locally are appended only when `accepts` claims
 * them as the outcome of an upload made on this page, so unsaved local removals are never undone.
 * Returns the original value with `changed: false` when nothing moved, so callers can skip the
 * control update.
 */
export function mergeUploadedFileAnswers(
  type: InformationRequestQuestionType,
  localValue: unknown,
  serverAnswer: unknown,
  accepts: (answer: InformationRequestFileAnswer) => boolean,
): MergedUploadedFileAnswers {
  if (type === InformationRequestQuestionType.MULTIFILE) {
    const local = Array.isArray(localValue) ? (localValue as InformationRequestFileAnswer[]) : [];
    const server = Array.isArray(serverAnswer) ? (serverAnswer as InformationRequestFileAnswer[]) : [];
    const serverByImportJobId = new Map(server.filter(answer => answer.importJobId).map(answer => [answer.importJobId, answer]));
    let refreshed = false;
    const current = local.map(answer => {
      const latest = answer.importJobId ? serverByImportJobId.get(answer.importJobId) : undefined;
      if (latest && hasFileSyncMoved(answer, latest)) {
        refreshed = true;
        return latest;
      }
      return answer;
    });
    const knownKeys = new Set(current.flatMap(answer => [fileAnswerKey(answer), answer.importJobId ?? ''].filter(Boolean)));
    const added = server.filter(
      answer => !knownKeys.has(fileAnswerKey(answer)) && !(answer.importJobId && knownKeys.has(answer.importJobId)) && accepts(answer),
    );
    if (!refreshed && added.length === 0) {
      return { added: [], changed: false, value: localValue };
    }
    return { added, changed: true, value: [...current, ...added] };
  }
  if (type === InformationRequestQuestionType.FILE) {
    const local = localValue as InformationRequestFileAnswer | null | undefined;
    const server = serverAnswer as InformationRequestFileAnswer | null | undefined;
    if (local && server && local.importJobId && local.importJobId === server.importJobId && hasFileSyncMoved(local, server)) {
      return { added: [], changed: true, value: server };
    }
    if (!local && server && accepts(server)) {
      return { added: [server], changed: true, value: server };
    }
  }
  return { added: [], changed: false, value: localValue };
}

function hasFileSyncMoved(local: InformationRequestFileAnswer, server: InformationRequestFileAnswer): boolean {
  return (
    local.syncStatus !== server.syncStatus ||
    local.driveFileId !== server.driveFileId ||
    local.webViewLink !== server.webViewLink ||
    local.announced !== server.announced ||
    (local.thumbnailUrl == null && server.thumbnailUrl != null)
  );
}

export function buildDisabledPreviewControl(question: InformationRequestQuestion): AbstractControl {
  const control = buildQuestionControl({ ...question, answer: null });
  control.disable({ emitEvent: false });
  return control;
}
