import { HttpErrorResponse } from '@angular/common/http';
import { isDevMode } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import * as Sentry from '@sentry/angular';

import { TranslationsContextData, TranslationsErrorPayload, TranslationsErrorType } from '../models/translations-tracking.model';
import { errorTranslations } from '../tracking/events/error-translations.event';

const VALIDATION_ERROR_KEYS = new Set([
  'planEdition.translationsEdition.languageNotSelected',
  'planEdition.translationsEdition.mandatoryFieldsError',
]);

type TranslationsErrorTrackingBase = Omit<TranslationsErrorPayload, 'errorMessage' | 'errorType'>;

export type TrackTranslationsErrorInput =
  | (TranslationsErrorTrackingBase & { error: unknown })
  | (TranslationsErrorTrackingBase & { errorMessage: string; errorType: TranslationsErrorType });

function resolveTranslationsErrorFields(
  payload: TrackTranslationsErrorInput,
): Pick<TranslationsErrorPayload, 'errorMessage' | 'errorType'> {
  if ('error' in payload) {
    return classifyTranslationsError(payload.error);
  }

  return {
    errorMessage: payload.errorMessage,
    errorType: payload.errorType,
  };
}

function reportDroppedTranslationsErrorTracking(payload: TrackTranslationsErrorInput): void {
  const errorDetails =
    'errorMessage' in payload
      ? {
          errorMessage: payload.errorMessage,
          errorType: payload.errorType,
        }
      : {};

  Sentry.addBreadcrumb({
    category: 'translations.tracking',
    data: {
      channelId: payload.channelId,
      field: payload.field,
      languageCode: payload.languageCode,
      operation: payload.operation,
      ...errorDetails,
    },
    level: 'warning',
    message: 'Skipped FZ|Translations|Error: partner/plan context unavailable',
  });

  if (isDevMode()) {
    console.warn('[translations tracking] Skipped FZ|Translations|Error: partner/plan context unavailable', payload);
  }
}

export function classifyTranslationsError(error: unknown): Pick<TranslationsErrorPayload, 'errorMessage' | 'errorType'> {
  if (error instanceof HttpErrorResponse) {
    return {
      errorMessage: `HTTP ${error.status}`,
      errorType: 'server',
    };
  }

  if (error instanceof Error) {
    const isValidation = VALIDATION_ERROR_KEYS.has(error.message);
    return {
      errorMessage: error.message,
      errorType: isValidation ? 'validation' : 'server',
    };
  }

  return {
    errorMessage: 'unknown_error',
    errorType: 'server',
  };
}

export function trackTranslationsError(
  fzTracking: FzTrackingService,
  context: TranslationsContextData | null,
  payload: TrackTranslationsErrorInput,
): void {
  if (context === null) {
    reportDroppedTranslationsErrorTracking(payload);
    return;
  }

  const { errorMessage, errorType } = resolveTranslationsErrorFields(payload);
  const { channelId, field, languageCode, operation } = payload;

  fzTracking.track(
    errorTranslations({
      ...context,
      channelId,
      field,
      languageCode,
      operation,
      errorMessage,
      errorType,
    }),
  );
}
