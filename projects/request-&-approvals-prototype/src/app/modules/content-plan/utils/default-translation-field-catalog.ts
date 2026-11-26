import { PlanTranslation } from '../models/plan-translation.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';

const PLAN_TRANSLATION_COUNTABLE_FIELDS = ['name', 'description', 'labelFormat', 'shortDescription'] as const;

type PlanTranslationCountableField = (typeof PLAN_TRANSLATION_COUNTABLE_FIELDS)[number];

const PLAN_RICH_TEXT_FIELDS: ReadonlySet<PlanTranslationCountableField> = new Set(['description']);

export type PlanTranslationCountedValues = Pick<PlanTranslation, 'name' | 'description' | 'labelFormat' | 'shortDescription'>;

export interface PlanTranslationOriginals {
  readonly originalLabelFormat: string;
  readonly originalShortDescription: string;
  /**
   * Drops the single `description` slot from the plan counts: component-based
   * descriptions are counted field by field, and the caller adds that count back.
   */
  readonly excludeDescription?: boolean;
}

export interface TranslationSlotCounts {
  readonly total: number;
  readonly translated: number;
}

export function isTranslationTextPopulated(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isHtmlMeaningful(html: string | undefined | null): boolean {
  if (!isTranslationTextPopulated(html)) {
    return false;
  }
  return isTranslationTextPopulated(stripHtmlForPresence(html as string));
}

function stripHtmlForPresence(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[^;]+;/g, ' ');
}

export function resolveTermsAndConditionsDisplayHtml(input: {
  isDefaultLanguageOnDefaultChannel: boolean;
  requiredPurchaseTermsSourceHtml: string;
  termsAndConditionsTranslatedHtml: string;
}): string {
  if (isHtmlMeaningful(input.termsAndConditionsTranslatedHtml)) {
    return input.termsAndConditionsTranslatedHtml;
  }
  if (input.isDefaultLanguageOnDefaultChannel && isHtmlMeaningful(input.requiredPurchaseTermsSourceHtml)) {
    return input.requiredPurchaseTermsSourceHtml;
  }
  return '';
}

export function countPlanTermsSlot(input: {
  requiredPurchaseTermsSourceHtml: string | undefined | null;
  termsAndConditionsHtml: string | undefined | null;
}): { total: number; translated: number } {
  if (!isHtmlMeaningful(input.requiredPurchaseTermsSourceHtml)) {
    return { total: 0, translated: 0 };
  }
  return { total: 1, translated: isHtmlMeaningful(input.termsAndConditionsHtml) ? 1 : 0 };
}

export function isPlanFieldPopulated(field: PlanTranslationCountableField, value: string | undefined | null): boolean {
  if (!isTranslationTextPopulated(value)) {
    return false;
  }
  if (PLAN_RICH_TEXT_FIELDS.has(field)) {
    return isTranslationTextPopulated(stripHtmlForPresence(value as string));
  }
  return true;
}

export function isPlanTranslationNameDescriptionPopulated(row: PlanTranslation | PlanTranslationCountedValues | null | undefined): boolean {
  return isPlanFieldPopulated('name', row?.name) && isPlanFieldPopulated('description', row?.description);
}

interface PlanSlotRules {
  readonly countsInTotal: boolean;
  readonly countsTranslated: boolean;
}

function planSlotRules(field: PlanTranslationCountableField, originals: PlanTranslationOriginals): PlanSlotRules {
  const hasOrigLabel = isTranslationTextPopulated(originals.originalLabelFormat);
  const hasOrigShort = isTranslationTextPopulated(originals.originalShortDescription);

  switch (field) {
    case 'name':
      return { countsInTotal: true, countsTranslated: true };
    case 'description': {
      const countsDescription = originals.excludeDescription !== true;
      return { countsInTotal: countsDescription, countsTranslated: countsDescription };
    }
    case 'labelFormat':
      return { countsInTotal: hasOrigLabel, countsTranslated: hasOrigLabel };
    case 'shortDescription':
      return { countsInTotal: hasOrigShort, countsTranslated: hasOrigShort };
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

export function planFieldCountsInTotal(field: PlanTranslationCountableField, originals: PlanTranslationOriginals): boolean {
  return planSlotRules(field, originals).countsInTotal;
}

export function countPlanTranslationSlots(
  row: PlanTranslationCountedValues | null | undefined,
  originals: PlanTranslationOriginals,
): TranslationSlotCounts {
  let total = 0;
  let translated = 0;

  for (const field of PLAN_TRANSLATION_COUNTABLE_FIELDS) {
    const rules = planSlotRules(field, originals);
    const populated = isPlanFieldPopulated(field, row?.[field]);

    if (rules.countsInTotal) {
      total += 1;
    }
    if (rules.countsTranslated && populated) {
      translated += 1;
    }
  }

  return { total, translated };
}

const SESSION_TYPE_TRANSLATION_COUNTABLE_FIELDS = ['label', 'details', 'instructions'] as const;

type SessionTypeCountableField = (typeof SESSION_TYPE_TRANSLATION_COUNTABLE_FIELDS)[number];

const SESSION_TYPE_RICH_TEXT_FIELDS: ReadonlySet<SessionTypeCountableField> = new Set(['details', 'instructions']);

export type SessionTypeTranslationCountedValues = Pick<SessionTypeTranslation, 'label' | 'details' | 'instructions'>;

export interface SessionTypeTranslationOriginals {
  readonly originalDetails: string;
  readonly originalInstructions: string;
}

interface SessionTypeSlotRules {
  readonly countsInTotal: boolean;
  readonly countsTranslated: boolean;
}

function sessionTypeSlotRules(field: SessionTypeCountableField, originals: SessionTypeTranslationOriginals): SessionTypeSlotRules {
  const hasOrigDetails = isSessionTypeFieldPopulated('details', originals.originalDetails);
  const hasOrigInstructions = isSessionTypeFieldPopulated('instructions', originals.originalInstructions);

  switch (field) {
    case 'label':
      return { countsInTotal: true, countsTranslated: true };
    case 'details':
      return { countsInTotal: hasOrigDetails, countsTranslated: hasOrigDetails };
    case 'instructions':
      return { countsInTotal: hasOrigInstructions, countsTranslated: hasOrigInstructions };
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function sessionTypeFieldReader(
  field: SessionTypeCountableField,
  row: SessionTypeTranslationCountedValues | undefined,
): string | undefined {
  switch (field) {
    case 'label':
      return row?.label;
    case 'details':
      return row?.details;
    case 'instructions':
      return row?.instructions;
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

export function isSessionTypeRichTextField(field: SessionTypeCountableField): boolean {
  return SESSION_TYPE_RICH_TEXT_FIELDS.has(field);
}

export function isSessionTypeFieldPopulated(field: SessionTypeCountableField, value: string | undefined | null): boolean {
  if (typeof value !== 'string' || !isTranslationTextPopulated(value)) {
    return false;
  }
  if (isSessionTypeRichTextField(field)) {
    return isTranslationTextPopulated(stripHtmlForPresence(value));
  }
  return true;
}

export function sessionTypeFieldCountsInTotal(field: SessionTypeCountableField, originals: SessionTypeTranslationOriginals): boolean {
  return sessionTypeSlotRules(field, originals).countsInTotal;
}

export function countSessionTypeTranslationSlots(
  translation: SessionTypeTranslationCountedValues | undefined,
  originals: SessionTypeTranslationOriginals,
): TranslationSlotCounts {
  let total = 0;
  let translated = 0;

  for (const field of SESSION_TYPE_TRANSLATION_COUNTABLE_FIELDS) {
    const rules = sessionTypeSlotRules(field, originals);
    const populated = isSessionTypeFieldPopulated(field, sessionTypeFieldReader(field, translation));

    if (rules.countsInTotal) {
      total += 1;
    }
    if (rules.countsTranslated && populated) {
      translated += 1;
    }
  }

  return { total, translated };
}

export function isSessionTypeTranslationRowComplete(
  translation: SessionTypeTranslationCountedValues | undefined,
  originals: SessionTypeTranslationOriginals,
): boolean {
  const counts = countSessionTypeTranslationSlots(translation, originals);
  return counts.total > 0 && counts.translated >= counts.total;
}
