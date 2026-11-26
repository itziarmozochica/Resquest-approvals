import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { isEmptyRichTextHtml } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';

import {
  ContentAnswer,
  ContentAnswerShape,
  ContentMultiAnswer,
  ContentQuestion,
  ContentQuestionOptionExtra,
  ContentQuestionType,
  ContentRangeAnswer,
  ContentSingleAnswer,
} from '../../../../models/content-questions.model';

export type ContentSingleAnswerGroup = FormGroup<{ extra: FormControl<string>; option: FormControl<string> }>;

export type ContentMultiAnswerGroup = FormGroup<{ extra: FormControl<string>; options: FormControl<string[]> }>;

export type ContentRangeAnswerGroup = FormGroup<{ max: FormControl<string>; min: FormControl<string> }>;

export type ContentQuestionControl = ContentMultiAnswerGroup | ContentRangeAnswerGroup | ContentSingleAnswerGroup | FormControl<string>;

export interface ContentQuestionField {
  control: ContentQuestionControl;
  hasError: boolean;
  isRequired: boolean;
  question: ContentQuestion;
}

/** How the free-value input beside a question renders, or `hidden` when the question asks for none. */
export type ContentQuestionExtraMode = 'hidden' | 'multiline' | 'number' | 'text';

export type ContentQuestionWidget = 'multi-select' | 'radio-group' | 'range' | 'rich-text' | 'single-select' | 'textarea';

const shapeByType: Readonly<Record<ContentQuestionType, ContentAnswerShape>> = {
  multi_select: 'multi',
  multi_select_open: 'multi',
  open_text: 'text',
  rich_text: 'rich_text',
  open_text_multi_select: 'multi',
  open_text_single_select: 'single',
  single_select: 'text',
  single_select_exact: 'single',
  single_select_number: 'single',
  structured_open_text: 'text',
  two_numbers: 'range',
  yes_no: 'text',
};

const alwaysVisibleExtraTypes: ReadonlySet<ContentQuestionType> = new Set<ContentQuestionType>([
  'multi_select_open',
  'open_text_multi_select',
  'open_text_single_select',
]);

const widgetByType: Readonly<Record<ContentQuestionType, ContentQuestionWidget>> = {
  multi_select: 'multi-select',
  multi_select_open: 'multi-select',
  open_text: 'textarea',
  rich_text: 'rich-text',
  open_text_multi_select: 'multi-select',
  open_text_single_select: 'single-select',
  single_select: 'single-select',
  single_select_exact: 'single-select',
  single_select_number: 'single-select',
  structured_open_text: 'textarea',
  two_numbers: 'range',
  yes_no: 'radio-group',
};

const optionDrivenExtraTypes: ReadonlySet<ContentQuestionType> = new Set<ContentQuestionType>([
  'open_text_single_select',
  'single_select_exact',
  'single_select_number',
]);

export const contentQuestionsTranslationPrefix = 'createEvent.quickSetupWizard.step1.contentQuestions';

export interface ContentQuestionsDescriptionMetadata {
  categoryLabel?: string;
  verticalLabel?: string;
}

export interface BuildContentQuestionsDescriptionParams {
  description: string;
  descriptionQuestionKey: string;
  metadata: ContentQuestionsDescriptionMetadata;
  questions: readonly ContentQuestion[];
  readAnswer: (question: ContentQuestion) => ContentAnswer | undefined;
  translate: (key: string) => string;
}

export function resolveContentAnswerShape(type: ContentQuestionType): ContentAnswerShape {
  return shapeByType[type];
}

export function resolveContentQuestionWidget(type: ContentQuestionType): ContentQuestionWidget {
  return widgetByType[type];
}

export function contentOptionTranslationKey(optionKey: string): string {
  return `${contentQuestionsTranslationPrefix}.options.${optionKey}`;
}

export function hasAlwaysVisibleExtra(type: ContentQuestionType): boolean {
  return alwaysVisibleExtraTypes.has(type);
}

export function resolveContentQuestionOptionExtra(question: ContentQuestion, optionKey: string): ContentQuestionOptionExtra | null {
  if (optionKey.length === 0) {
    return null;
  }

  return question.options?.find(option => option.key === optionKey)?.extra ?? null;
}

export function isOptionDrivenExtraVisible(question: ContentQuestion, optionKey: string): boolean {
  return optionDrivenExtraTypes.has(question.type) && resolveContentQuestionOptionExtra(question, optionKey) !== null;
}

export function isMultiOptionDrivenExtraVisible(question: ContentQuestion, selectedOptionKeys: readonly string[]): boolean {
  return (
    (question.type === 'multi_select' || question.type === 'multi_select_open') &&
    selectedOptionKeys.some(optionKey => resolveContentQuestionOptionExtra(question, optionKey) !== null)
  );
}

const contentQuestionsDescriptionBlockSeparator = '<p><br></p>';

export function buildContentQuestionsDescription(params: BuildContentQuestionsDescriptionParams): string {
  const { description, descriptionQuestionKey, metadata, questions, readAnswer, translate } = params;
  const descriptionQuestion = questions.find(question => question.key === descriptionQuestionKey);

  return joinContentQuestionsDescriptionHtmlBlocks([
    buildContentQuestionsMetadataDescriptionHtml(metadata, translate),
    buildContentQuestionsAnswersDescriptionHtml(questions, descriptionQuestionKey, readAnswer, translate),
    buildContentQuestionsDescriptionFieldHtml(description, descriptionQuestion, translate),
  ]);
}

function buildContentQuestionsMetadataDescriptionHtml(
  metadata: ContentQuestionsDescriptionMetadata,
  translate: (key: string) => string,
): string {
  const lines: string[] = [];

  if (metadata.verticalLabel !== undefined) {
    lines.push(`${translate(`${contentQuestionsTranslationPrefix}.descriptionVertical`)}: ${metadata.verticalLabel}`);
  }

  if (metadata.categoryLabel !== undefined) {
    lines.push(`${translate(`${contentQuestionsTranslationPrefix}.descriptionCategory`)}: ${metadata.categoryLabel}`);
  }

  return linesToHtml(lines);
}

function buildContentQuestionsAnswersDescriptionHtml(
  questions: readonly ContentQuestion[],
  descriptionQuestionKey: string,
  readAnswer: (question: ContentQuestion) => ContentAnswer | undefined,
  translate: (key: string) => string,
): string {
  const lines = questions
    .filter(question => question.key !== descriptionQuestionKey)
    .flatMap(question => {
      const answer = readAnswer(question);

      return answer === undefined ? [] : formatQuestionAnswerLines(question, answer, translate);
    });

  return linesToHtml(lines);
}

function buildContentQuestionsDescriptionFieldHtml(
  description: string,
  descriptionQuestion: ContentQuestion | undefined,
  translate: (key: string) => string,
): string {
  const trimmedDescription = description.trim();

  if (trimmedDescription.length === 0) {
    return '';
  }

  if (descriptionQuestion?.type === 'rich_text') {
    return isEmptyRichTextHtml(trimmedDescription) ? '' : trimmedDescription;
  }

  const lines: string[] = [];

  appendMultilineAnswer(lines, translate(`${contentQuestionsTranslationPrefix}.questions.description`), trimmedDescription);

  return linesToHtml(lines);
}

function joinContentQuestionsDescriptionHtmlBlocks(blocks: readonly string[]): string {
  return blocks.filter(block => block.length > 0).join(contentQuestionsDescriptionBlockSeparator);
}

export function prependVerticalToContentQuestionsDescription(
  html: string,
  verticalLabel: string,
  translate: (key: string) => string,
): string {
  const verticalHtml = linesToHtml([`${translate(`${contentQuestionsTranslationPrefix}.descriptionVertical`)}: ${verticalLabel}`]);
  const trimmedHtml = html.trim();

  if (trimmedHtml.length === 0) {
    return verticalHtml;
  }

  return `${verticalHtml}<p><br></p>${trimmedHtml}`;
}

export function resolveMultiOptionExtraInputType(question: ContentQuestion, selectedOptionKeys: readonly string[]): 'number' | 'text' {
  const specifyOptionKeys = selectedOptionKeys.filter(optionKey => resolveContentQuestionOptionExtra(question, optionKey) !== null);

  if (specifyOptionKeys.length === 0) {
    return 'text';
  }

  return specifyOptionKeys.every(optionKey => resolveContentQuestionOptionExtra(question, optionKey) === 'number') ? 'number' : 'text';
}

export function resolveSingleExtraMode(question: ContentQuestion, optionKey: string): ContentQuestionExtraMode {
  const optionExtra = resolveContentQuestionOptionExtra(question, optionKey);

  if (optionExtra !== null) {
    return optionExtra;
  }

  return question.type === 'open_text_single_select' ? 'multiline' : 'hidden';
}

export function resolveMultiExtraMode(question: ContentQuestion, selectedOptionKeys: readonly string[]): ContentQuestionExtraMode {
  if (isMultiOptionDrivenExtraVisible(question, selectedOptionKeys)) {
    return resolveMultiOptionExtraInputType(question, selectedOptionKeys);
  }

  return question.type === 'open_text_multi_select' ? 'multiline' : 'hidden';
}

export function splitContentQuestionLayoutColumns<T extends { question: Pick<ContentQuestion, 'key'> }>(
  fields: readonly T[],
  descriptionQuestionKey: string,
): readonly [T[], T[]] {
  const descriptionColumn: T[] = [];
  const categoryQuestionsColumn: T[] = [];

  fields.forEach(field => {
    if (field.question.key === descriptionQuestionKey) {
      descriptionColumn.push(field);
    } else {
      categoryQuestionsColumn.push(field);
    }
  });

  return [descriptionColumn, categoryQuestionsColumn];
}

export function createContentQuestionControl(formBuilder: FormBuilder, question: ContentQuestion): ContentQuestionControl {
  switch (resolveContentAnswerShape(question.type)) {
    case 'single':
      return formBuilder.nonNullable.group({ extra: formBuilder.nonNullable.control(''), option: formBuilder.nonNullable.control('') });
    case 'multi':
      return formBuilder.nonNullable.group({
        extra: formBuilder.nonNullable.control(''),
        options: formBuilder.nonNullable.control<string[]>([]),
      });
    case 'range':
      return formBuilder.nonNullable.group({
        max: formBuilder.nonNullable.control('', { validators: [contentRangeMaxBoundValidator] }),
        min: formBuilder.nonNullable.control('', { validators: [contentRangeMinBoundValidator] }),
      });
    case 'rich_text':
    case 'text':
      return formBuilder.nonNullable.control('');
  }
}

export function attachContentRangeValidators(group: ContentRangeAnswerGroup, destroyRef: DestroyRef): void {
  group.controls.min.valueChanges
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => group.controls.max.updateValueAndValidity({ emitEvent: false }));

  group.controls.max.valueChanges
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => group.controls.min.updateValueAndValidity({ emitEvent: false }));
}

export function createContentQuestionValidator(question: ContentQuestion): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const questionControl = control as ContentQuestionControl;
    const isRequired = isContentQuestionRequiredNow(question, questionControl);
    const answer = mapContentQuestionAnswer(question, questionControl);

    if (isRequired && !hasContentAnswerValue(question, answer)) {
      return { required: true };
    }

    if (resolveContentAnswerShape(question.type) === 'range') {
      const rangeErrors = validateContentRangeAnswer(answer as ContentRangeAnswer);

      if (rangeErrors !== null) {
        return rangeErrors;
      }
    }

    return isMissingContentAnswerExtra(question, answer, isRequired) ? { required: true } : null;
  };
}

export function resolveContentQuestionErrorTranslationKey(errors: ValidationErrors | null): string | null {
  if (errors === null) {
    return null;
  }

  if (errors['rangeMinPositive'] === true || errors['rangeMaxPositive'] === true || errors['rangePositive'] === true) {
    return `${contentQuestionsTranslationPrefix}.rangePositiveError`;
  }

  if (errors['rangeOrder'] === true) {
    return `${contentQuestionsTranslationPrefix}.rangeOrderError`;
  }

  if (errors['required'] === true) {
    return `${contentQuestionsTranslationPrefix}.requiredError`;
  }

  return `${contentQuestionsTranslationPrefix}.requiredError`;
}

export function validateContentRangeAnswer(answer: ContentRangeAnswer): ValidationErrors | null {
  const { max, min } = answer;

  if (min !== null && min <= 0) {
    return { rangeMinPositive: true };
  }

  if (max !== null && max <= 0) {
    return { rangeMaxPositive: true };
  }

  if (min !== null && max !== null && max <= min) {
    return { rangeOrder: true };
  }

  return null;
}

export function isContentQuestionRequiredNow(question: ContentQuestion, control: ContentQuestionControl): boolean {
  const requiredWhen = question.requiredWhen;

  switch (requiredWhen.kind) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'condition':
      return controlHoldsOption(control.parent?.get(requiredWhen.questionKey) ?? null, requiredWhen.optionKey);
  }
}

export function hasContentAnswerValue(question: ContentQuestion, answer: ContentAnswer): boolean {
  switch (resolveContentAnswerShape(question.type)) {
    case 'single':
      return (answer as ContentSingleAnswer).option.length > 0;
    case 'multi':
      return (answer as ContentMultiAnswer).options.length > 0;
    case 'range': {
      const { max, min } = answer as ContentRangeAnswer;

      return max !== null || min !== null;
    }
    case 'rich_text':
      return !isEmptyRichTextHtml(answer as string);
    case 'text':
      return (answer as string).length > 0;
  }
}

export function isMissingContentAnswerExtra(question: ContentQuestion, answer: ContentAnswer, isRequired: boolean): boolean {
  if (typeof answer === 'string' || 'min' in answer) {
    return false;
  }

  const extra = answer.extra ?? '';

  if (extra.length > 0) {
    return false;
  }

  if ('option' in answer) {
    if (isOptionDrivenExtraVisible(question, answer.option)) {
      return true;
    }
  } else if (isMultiOptionDrivenExtraVisible(question, answer.options)) {
    return true;
  }

  if (hasAlwaysVisibleExtra(question.type)) {
    return isRequired && hasContentAnswerValue(question, answer);
  }

  return false;
}

function controlHoldsOption(control: AbstractControl | null, optionKey: string): boolean {
  const value: unknown = control?.getRawValue();

  if (typeof value === 'string') {
    return value === optionKey;
  }

  if (value === null || typeof value !== 'object') {
    return false;
  }

  const { option, options } = value as { option?: unknown; options?: unknown };

  if (typeof option === 'string') {
    return option === optionKey;
  }

  return Array.isArray(options) && options.includes(optionKey);
}

export function mapContentQuestionAnswer(question: ContentQuestion, control: ContentQuestionControl): ContentAnswer {
  switch (resolveContentAnswerShape(question.type)) {
    case 'single': {
      const { extra, option } = (control as ContentSingleAnswerGroup).getRawValue();
      const answer: ContentSingleAnswer = { option };

      return extra.trim().length > 0 ? { ...answer, extra: extra.trim() } : answer;
    }
    case 'multi': {
      const { extra, options } = (control as ContentMultiAnswerGroup).getRawValue();
      const answer: ContentMultiAnswer = { options: [...options] };

      return extra.trim().length > 0 ? { ...answer, extra: extra.trim() } : answer;
    }
    case 'range': {
      const { max, min } = (control as ContentRangeAnswerGroup).getRawValue();
      const answer: ContentRangeAnswer = { max: toNumberOrNull(max), min: toNumberOrNull(min) };

      return answer;
    }
    case 'rich_text':
      return (control as FormControl<string>).getRawValue();
    case 'text':
      return (control as FormControl<string>).getRawValue().trim();
  }
}

export function patchContentQuestionAnswer(question: ContentQuestion, control: ContentQuestionControl, answer: ContentAnswer): void {
  switch (resolveContentAnswerShape(question.type)) {
    case 'single': {
      if (typeof answer !== 'object' || !('option' in answer)) {
        return;
      }

      (control as ContentSingleAnswerGroup).setValue({ extra: answer.extra ?? '', option: answer.option }, { emitEvent: false });

      return;
    }
    case 'multi': {
      if (typeof answer !== 'object' || !('options' in answer)) {
        return;
      }

      (control as ContentMultiAnswerGroup).setValue({ extra: answer.extra ?? '', options: [...answer.options] }, { emitEvent: false });

      return;
    }
    case 'range': {
      if (typeof answer !== 'object' || !('min' in answer)) {
        return;
      }

      (control as ContentRangeAnswerGroup).setValue(
        { max: answer.max === null ? '' : String(answer.max), min: answer.min === null ? '' : String(answer.min) },
        { emitEvent: false },
      );

      return;
    }
    case 'rich_text':
    case 'text': {
      if (typeof answer !== 'string') {
        return;
      }

      (control as FormControl<string>).setValue(answer, { emitEvent: false });
    }
  }
}

function appendExtraLine(
  lines: string[],
  question: ContentQuestion,
  answer: ContentMultiAnswer | ContentSingleAnswer,
  translate: (key: string) => string,
): void {
  const extra = answer.extra?.trim() ?? '';

  if (extra.length === 0) {
    return;
  }

  const labelKey = resolveExtraLabelKey(question, answer);

  if (labelKey === null) {
    return;
  }

  lines.push(`${translate(`${contentQuestionsTranslationPrefix}.${labelKey}`)}: ${extra}`);
}

function appendMultilineAnswer(lines: string[], label: string, value: string): void {
  const valueLines = value.split('\n');

  if (valueLines.length === 1) {
    lines.push(`${label}: ${valueLines[0]}`);

    return;
  }

  lines.push(`${label}:`);
  lines.push(...valueLines);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatQuestionAnswerLines(question: ContentQuestion, answer: ContentAnswer, translate: (key: string) => string): string[] {
  if (!hasContentAnswerValue(question, answer)) {
    return [];
  }

  const questionLabel = translate(`${contentQuestionsTranslationPrefix}.questions.${question.labelKey}`);
  const lines: string[] = [];
  const translateOption = (optionKey: string): string => translate(contentOptionTranslationKey(optionKey));

  switch (resolveContentAnswerShape(question.type)) {
    case 'rich_text': {
      appendMultilineAnswer(lines, questionLabel, answer as string);

      break;
    }
    case 'text': {
      const value = answer as string;

      if (question.type === 'single_select' || question.type === 'yes_no') {
        lines.push(`${questionLabel}: ${translateOption(value)}`);
      } else {
        appendMultilineAnswer(lines, questionLabel, value);
      }

      break;
    }
    case 'single': {
      const singleAnswer = answer as ContentSingleAnswer;

      lines.push(`${questionLabel}: ${translateOption(singleAnswer.option)}`);
      appendExtraLine(lines, question, singleAnswer, translate);

      break;
    }
    case 'multi': {
      const multiAnswer = answer as ContentMultiAnswer;
      const optionLabels = multiAnswer.options.map(translateOption).join(', ');

      lines.push(`${questionLabel}: ${optionLabels}`);
      appendExtraLine(lines, question, multiAnswer, translate);

      break;
    }
    case 'range': {
      const { max, min } = answer as ContentRangeAnswer;

      lines.push(`${questionLabel}: ${formatRangeAnswer(min, max)}`);

      break;
    }
  }

  return lines;
}

function formatRangeAnswer(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `${min} - ${max}`;
  }

  if (min !== null) {
    return String(min);
  }

  return max === null ? '' : String(max);
}

function linesToHtml(lines: string[]): string {
  return lines.map(line => (line.length === 0 ? '<p><br></p>' : `<p>${escapeHtml(line)}</p>`)).join('');
}

function resolveExtraLabelKey(
  question: ContentQuestion,
  answer: ContentMultiAnswer | ContentSingleAnswer,
): 'descriptionExtraDetails' | 'descriptionExtraSpecification' | null {
  if (hasAlwaysVisibleExtra(question.type)) {
    return 'descriptionExtraSpecification';
  }

  if ('option' in answer) {
    return resolveContentQuestionOptionExtra(question, answer.option) !== null
      ? 'descriptionExtraDetails'
      : question.type === 'open_text_single_select'
        ? 'descriptionExtraSpecification'
        : null;
  }

  return answer.options.some(optionKey => resolveContentQuestionOptionExtra(question, optionKey) !== null)
    ? 'descriptionExtraDetails'
    : null;
}

function contentRangeMaxBoundValidator(control: AbstractControl): ValidationErrors | null {
  const max = toNumberOrNull(String(control.value ?? ''));
  const parent = control.parent as ContentRangeAnswerGroup | null;
  const min = parent === null ? null : toNumberOrNull(parent.controls.min.value ?? '');

  if (max !== null && max <= 0) {
    return { rangePositive: true };
  }

  if (min !== null && max !== null && max <= min) {
    return { rangeOrder: true };
  }

  return null;
}

function contentRangeMinBoundValidator(control: AbstractControl): ValidationErrors | null {
  const min = toNumberOrNull(String(control.value ?? ''));
  const parent = control.parent as ContentRangeAnswerGroup | null;

  if (parent === null) {
    return min !== null && min <= 0 ? { rangePositive: true } : null;
  }

  const answer: ContentRangeAnswer = { max: toNumberOrNull(parent.controls.max.value ?? ''), min };

  if (answer.min !== null && answer.min <= 0) {
    return { rangePositive: true };
  }

  if (answer.min !== null && answer.max !== null && answer.max <= answer.min) {
    return { rangeOrder: true };
  }

  return null;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}
