import type { ScreenState } from '../models/immersive-content-plan-screen-state.model';
import type { ImmersiveLayoutDocument } from '../models/immersive-layout-document.model';
import type { PlanviewLayoutEnvelope } from '../models/planview-layout-envelope.model';
import { parseEditableModuleKey } from './immersive-layout-general-settings.util';
import { PREFERRED_BASE_LOCALE, resolveBaseLocale } from './immersive-layout-locale.util';
import type { PublishValidationResult } from './immersive-layout-publish-validation.util';

export interface DocumentGapReport {
  // `${moduleId}::${fieldPath}` for every error the validator pinned to one field. Translation gaps
  // are not here: the field view counts those per locale itself.
  fieldErrorPaths: ReadonlySet<string>;
  // Per exact editable key (`description`, `description@mastercard`), and per base module id with its variants.
  gapsByEditableKey: Record<string, number>;
  gapsByModuleId: Record<string, number>;
  totalGapCount: number;
}

export const EMPTY_GAP_REPORT: DocumentGapReport = {
  fieldErrorPaths: new Set(),
  gapsByEditableKey: {},
  gapsByModuleId: {},
  totalGapCount: 0,
};

export function fieldErrorKey(moduleId: string, fieldPath: string): string {
  return `${moduleId}::${fieldPath}`;
}

export function isGenerationPollable(envelope: PlanviewLayoutEnvelope | null): boolean {
  if (envelope === null || envelope.layout !== null) {
    return false;
  }
  const state = envelope.generation?.state;
  return state === 'scheduled' || state === 'processing';
}

export function deriveScreenState(envelope: PlanviewLayoutEnvelope | null, isLoading: boolean, error: unknown): ScreenState {
  if (envelope === null) {
    return isLoading || error === null ? 'loading' : 'error';
  }
  if (envelope.layout !== null) {
    return 'document';
  }
  if (envelope.generation === null) {
    return 'empty';
  }
  return isGenerationPollable(envelope) ? 'generating' : 'failed';
}

export function deriveBaseLocale(layout: ImmersiveLayoutDocument | null): string | null {
  return layout === null ? null : (layout.base_locale ?? resolveBaseLocale(layout.available_languages, PREFERRED_BASE_LOCALE));
}

// Picking the locale an unset layout already resolves to keeps it unset, so the choice is not a change.
export function deriveBaseLocaleDraft(committed: ImmersiveLayoutDocument | null, locale: string): string | null {
  const isUnsetChoice = committed !== null && committed.base_locale == null && deriveBaseLocale(committed) === locale;
  return isUnsetChoice ? null : locale;
}

// The module gap badge is exactly the publish validator's verdict, grouped: one derivation, so a
// document can never look clean in the panel list and be refused at publish.
export function deriveGapReport(validation: PublishValidationResult): DocumentGapReport {
  return {
    fieldErrorPaths: validation.errors.reduce<Set<string>>((paths, error) => {
      if (error.moduleId !== undefined && error.fieldPath !== undefined) {
        paths.add(fieldErrorKey(error.moduleId, error.fieldPath));
      }
      return paths;
    }, new Set()),
    // The accumulator is mutated, never spread: `missing_translation` errors arrive at
    // `locales × untranslated tokens`, so cloning it per error made the badge quadratic on a
    // document the size of a real one, on every keystroke.
    gapsByEditableKey: validation.errors.reduce<Record<string, number>>((counts, error) => {
      if (error.moduleId !== undefined) {
        counts[error.moduleId] = (counts[error.moduleId] ?? 0) + 1;
      }
      return counts;
    }, {}),
    gapsByModuleId: validation.errors.reduce<Record<string, number>>((counts, error) => {
      if (error.moduleId !== undefined) {
        const { moduleId } = parseEditableModuleKey(error.moduleId);
        counts[moduleId] = (counts[moduleId] ?? 0) + 1;
      }
      return counts;
    }, {}),
    totalGapCount: validation.errors.length,
  };
}
